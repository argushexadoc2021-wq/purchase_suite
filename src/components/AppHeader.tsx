import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Shield, Github } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/admin.functions";

export function AppHeader() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);

  const { data: profile, error, isLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: () => fetchProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link to="/invoices" className="font-display text-2xl font-semibold tracking-tight text-primary">
            Argus Purchase Suite
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <Link to="/invoices">
              <Button variant="ghost" size="sm">
                Invoices
              </Button>
            </Link>
            {(profile?.role === "company_admin" || profile?.role === "super_admin") && (
              <Link to="/settings">
                <Button variant="ghost" size="sm">
                  User Management
                </Button>
              </Link>
            )}
            {profile?.is_admin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm">
                  <Shield className="mr-1 size-3.5" />
                  Admin
                </Button>
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-sm text-muted-foreground hidden md:inline">{profile.email}</span>
          )}
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
