import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Shield, User } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { listCompanyUsers, createCompanyUser, removeCompanyUser } from "@/lib/company.functions";

export const Route = createFileRoute("/_authenticated/settings")({
    beforeLoad: ({ context }) => {
        // Only allow company_admin or super_admin
        if (context.profile?.role !== "company_admin" && context.profile?.role !== "super_admin") {
            throw redirect({ to: "/invoices" });
        }
    },
    component: SettingsPage,
});

function SettingsPage() {
    const queryClient = useQueryClient();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserName, setNewUserName] = useState("");
    const [newUserRole, setNewUserRole] = useState("user");

    const { data: users, isLoading } = useQuery({
        queryKey: ["company-users"],
        queryFn: () => listCompanyUsers(),
    });

    const addUserMutation = useMutation({
        mutationFn: (data: { email: string; full_name: string; role: string }) => createCompanyUser({ data }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["company-users"] });
            setIsAddUserOpen(false);
            setNewUserEmail("");
            setNewUserName("");
            setNewUserRole("user");
            toast.success(`User added! Temporary password: ${res.temporaryPassword}`, {
                duration: 10000,
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const removeUserMutation = useMutation({
        mutationFn: (targetUserId: string) => removeCompanyUser({ data: { targetUserId } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["company-users"] });
            toast.success("User removed successfully.");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        addUserMutation.mutate({
            email: newUserEmail,
            full_name: newUserName,
            role: newUserRole,
        });
    };

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <div className="mx-auto max-w-5xl p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold">User Management</h1>
                        <p className="text-sm text-muted-foreground">Manage your team and company details.</p>
                    </div>
                    <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 size-4" />
                                Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                                <DialogDescription>
                                    Invite a new user to your company. They will be given a temporary password.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddUser} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        required
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select value={newUserRole} onValueChange={setNewUserRole}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="company_admin">Company Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full" disabled={addUserMutation.isPending}>
                                    {addUserMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                    Add User
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="surface-panel overflow-hidden">
                    <div className="border-b border-border px-6 py-4">
                        <h2 className="font-semibold">Team Members</h2>
                    </div>
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading users...</div>
                    ) : users?.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No users found.</div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {users?.map((user) => (
                                <li key={user.id} className="flex items-center justify-between px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                                            {user.role === "company_admin" ? <Shield className="size-5" /> : <User className="size-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium">{user.full_name || "Unknown"}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground capitalize">
                                            {user.role?.replace("_", " ")}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => {
                                                if (confirm("Are you sure you want to remove this user?")) {
                                                    removeUserMutation.mutate(user.id);
                                                }
                                            }}
                                            disabled={removeUserMutation.isPending}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
