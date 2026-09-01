import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Types ───────────────────────────────────────────────────────────
type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  role: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Helper: assert caller is admin ──────────────────────────────────
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.is_admin) throw new Error("Forbidden: admin access required.");
}

// ─── List all users ──────────────────────────────────────────────────
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as UserRow[];
  });

// ─── List all companies with user counts ───────────────────────────────
export const listCompaniesWithUserCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch all companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (companiesError) throw new Error(companiesError.message);

    // Fetch all profiles to count users per company and find admins
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, role, email, full_name, is_active, created_at");

    if (profilesError) throw new Error(profilesError.message);

    // Calculate counts, find admins, and group users
    const counts: Record<string, number> = {};
    const admins: Record<string, string> = {};
    const companyUsers: Record<string, any[]> = {};

    for (const profile of profiles) {
      if (profile.company_id) {
        counts[profile.company_id] = (counts[profile.company_id] || 0) + 1;

        if (!companyUsers[profile.company_id]) {
          companyUsers[profile.company_id] = [];
        }
        companyUsers[profile.company_id].push(profile);

        if (profile.role === "company_admin" && profile.email) {
          admins[profile.company_id] = profile.email;
        }
      }
    }

    return companies.map(c => ({
      ...c,
      userCount: counts[c.id] || 0,
      adminEmail: admins[c.id] || "Unknown",
      users: companyUsers[c.id] || []
    }));
  });

// ─── Create a new user ──────────────────────────────────────────────
export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { email: string; password: string; full_name: string; is_admin: boolean }) => {
      if (!input?.email?.trim()) throw new Error("Email is required.");
      if (!input?.password || input.password.length < 6)
        throw new Error("Password must be at least 6 characters.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create the auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createError) throw new Error(createError.message);

    // Update profile with admin flag
    if (data.is_admin && newUser.user) {
      await supabaseAdmin.from("profiles").update({ is_admin: true }).eq("id", newUser.user.id);
    }

    return { ok: true, userId: newUser.user?.id };
  });

// ─── Toggle admin status ────────────────────────────────────────────
export const toggleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetUserId: string; is_admin: boolean }) => {
    if (!input?.targetUserId) throw new Error("User ID required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.targetUserId === context.userId) {
      throw new Error("You cannot change your own admin status.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_admin: data.is_admin })
      .eq("id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Toggle active status ───────────────────────────────────────────
export const toggleActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetUserId: string; is_active: boolean }) => {
    if (!input?.targetUserId) throw new Error("User ID required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.targetUserId === context.userId) {
      throw new Error("You cannot deactivate your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.is_active })
      .eq("id", data.targetUserId);
    if (error) throw new Error(error.message);

    // If deactivating, also ban the user from auth
    if (!data.is_active) {
      await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
        ban_duration: "876000h",
      });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
        ban_duration: "none",
      });
    }
    return { ok: true };
  });

// ─── Reset password ─────────────────────────────────────────────────
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetUserId: string; newPassword: string }) => {
    if (!input?.targetUserId) throw new Error("User ID required.");
    if (!input?.newPassword || input.newPassword.length < 6)
      throw new Error("Password must be at least 6 characters.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Delete user ────────────────────────────────────────────────────
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetUserId: string }) => {
    if (!input?.targetUserId) throw new Error("User ID required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.targetUserId === context.userId) {
      throw new Error("You cannot delete your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Get current user's admin status ────────────────────────────────
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, is_admin, is_active, role")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as UserRow | null;
  });
