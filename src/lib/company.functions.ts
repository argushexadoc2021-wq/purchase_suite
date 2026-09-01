import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Helper: assert caller is company admin ───────────────────────────
async function assertCompanyAdmin(supabase: any, userId: string) {
    const { data, error } = await supabase
        .from("profiles")
        .select("role, company_id")
        .eq("id", userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.role !== "company_admin") throw new Error("Forbidden: company admin access required.");
    if (!data?.company_id) throw new Error("Forbidden: you are not associated with a company.");
    return data.company_id;
}

// ─── List company users ──────────────────────────────────────────────
export const listCompanyUsers = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
        const companyId = await assertCompanyAdmin(context.supabase, context.userId);
        const { data, error } = await context.supabase
            .from("profiles")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    });

// ─── Create a new company user ────────────────────────────────────────
export const createCompanyUser = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator(
        (input: { email: string; password?: string; full_name: string; role: string }) => {
            if (!input?.email?.trim()) throw new Error("Email is required.");
            return input;
        },
    )
    .handler(async ({ data, context }) => {
        const companyId = await assertCompanyAdmin(context.supabase, context.userId);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Create the auth user
        // Generate a random password if not provided
        const password = data.password || Math.random().toString(36).slice(-8) + "A1!";

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email.trim().toLowerCase(),
            password: password,
            email_confirm: true,
            user_metadata: { full_name: data.full_name },
        });
        if (createError) throw new Error(createError.message);

        // Update profile with company_id and role
        if (newUser.user) {
            await supabaseAdmin.from("profiles").update({
                company_id: companyId,
                role: data.role || "user"
            }).eq("id", newUser.user.id);
        }

        return { ok: true, userId: newUser.user?.id, temporaryPassword: password };
    });

// ─── Remove user from company ─────────────────────────────────────────
export const removeCompanyUser = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: { targetUserId: string }) => {
        if (!input?.targetUserId) throw new Error("User ID required.");
        return input;
    })
    .handler(async ({ data, context }) => {
        const companyId = await assertCompanyAdmin(context.supabase, context.userId);
        if (data.targetUserId === context.userId) {
            throw new Error("You cannot remove yourself.");
        }

        // Ensure the target user is actually in this company
        const { data: targetProfile } = await context.supabase
            .from("profiles")
            .select("company_id")
            .eq("id", data.targetUserId)
            .single();

        if (targetProfile?.company_id !== companyId) {
            throw new Error("User is not in your company.");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // We can either delete the user entirely or just remove them from the company.
        // Let's just delete the user for simplicity since they were created for this company.
        const { error } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
        if (error) throw new Error(error.message);

        return { ok: true };
    });
