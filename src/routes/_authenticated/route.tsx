import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", data.user.id)
      .single();

    if (!profile?.company_id && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }

    return { user: data.user, profile };
  },
  component: () => <Outlet />,
});
