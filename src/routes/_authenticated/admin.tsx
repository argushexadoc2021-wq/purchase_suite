import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Shield,
  ShieldOff,
  Trash2,
  KeyRound,
  Power,
  PowerOff,
  Loader2,
  Search,
  Users,
  ShieldCheck,
  UserX,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  listUsers,
  createUser,
  toggleAdmin,
  toggleActive,
  resetUserPassword,
  deleteUser,
  getMyProfile,
  listCompaniesWithUserCount,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

export default function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchUsers = useServerFn(listUsers);
  const fetchCompanies = useServerFn(listCompaniesWithUserCount);
  const fetchProfile = useServerFn(getMyProfile);
  const createUserFn = useServerFn(createUser);
  const toggleAdminFn = useServerFn(toggleAdmin);
  const toggleActiveFn = useServerFn(toggleActive);
  const resetPasswordFn = useServerFn(resetUserPassword);
  const deleteUserFn = useServerFn(deleteUser);

  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);

  // Create user form
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Reset password form
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Check if current user is admin
  const { data: myProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: () => fetchProfile(),
  });

  const {
    data: companies,
    isLoading: companiesLoading,
    isError: companiesError,
  } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: () => fetchCompanies(),
    enabled: !!myProfile?.is_admin,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createUserFn({
        data: {
          email: newEmail,
          password: newPassword,
          full_name: newFullName,
          is_admin: newIsAdmin,
        },
      }),
    onSuccess: () => {
      toast.success("User created successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreateDialog(false);
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      setNewIsAdmin(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: (vars: { targetUserId: string; is_admin: boolean }) =>
      toggleAdminFn({ data: vars }),
    onSuccess: () => {
      toast.success("Admin status updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (vars: { targetUserId: string; is_active: boolean }) =>
      toggleActiveFn({ data: vars }),
    onSuccess: () => {
      toast.success("User status updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      resetPasswordFn({
        data: { targetUserId: selectedUserId!, newPassword: resetPassword },
      }),
    onSuccess: () => {
      toast.success("Password updated successfully.");
      setShowPasswordDialog(false);
      setResetPassword("");
      setSelectedUserId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserFn({ data: { targetUserId: selectedUserId! } }),
    onSuccess: () => {
      toast.success("User deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowDeleteDialog(false);
      setSelectedUserId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!myProfile?.is_admin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-lg mx-auto text-center py-32">
          <ShieldOff className="mx-auto size-16 text-destructive/50 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You do not have admin privileges to access this page.
          </p>
          <Button onClick={() => navigate({ to: "/invoices" })}>Go to Invoices</Button>
        </div>
      </div>
    );
  }

  const filteredCompanies = (companies ?? []).filter(
    (c) =>
      (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.gst_number ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalCompanies = companies?.length ?? 0;
  const totalUsersAcrossCompanies = companies?.reduce((sum, c) => sum + (c.userCount || 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Companies
                </p>
                <p className="text-2xl font-bold">{totalCompanies}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-amber-500" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Users
                </p>
                <p className="text-2xl font-bold">{totalUsersAcrossCompanies}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by company name or GST..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 size-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new user account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="admin-check"
                    checked={newIsAdmin}
                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="admin-check" className="cursor-pointer">
                    Grant admin access
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Companies Table */}
        {companiesLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : companiesError ? (
          <div className="text-center py-20 text-destructive">
            Failed to load companies. Please check your admin privileges.
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Admin Email</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No companies found.
                    </TableCell>
                  </TableRow>
                )}
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <p className="font-medium">{company.name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{company.gst_number}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{company.adminEmail}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-muted-foreground" />
                        <span>{company.userCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCompany(company);
                          setShowUsersDialog(true);
                        }}
                      >
                        <Eye className="mr-2 size-4" />
                        View Users
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter a new password for this user.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Password</Label>
            <div className="relative mt-1">
              <Input
                type={showResetPassword ? "text" : "password"}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowResetPassword(!showResetPassword)}
              >
                {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => resetPasswordMutation.mutate()}
              disabled={resetPasswordMutation.isPending || resetPassword.length < 6}
            >
              {resetPasswordMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this user? This action cannot be undone.
              All their invoices will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Users Dialog */}
      <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Users in {selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              All users registered under this company.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCompany?.users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedCompany?.users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "company_admin" ? "default" : "secondary"}>
                          {user.role?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive/30">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowUsersDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
