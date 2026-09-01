import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/onboarding")({
    component: OnboardingPage,
});

function OnboardingPage() {
    const navigate = useNavigate();
    const [orgName, setOrgName] = useState("");
    const [gstNumber, setGstNumber] = useState("");
    const [busy, setBusy] = useState(false);
    const [isVerifyingGst, setIsVerifyingGst] = useState(false);
    const [isGstVerified, setIsGstVerified] = useState(false);
    const [existingCompany, setExistingCompany] = useState<{ name: string } | null>(null);

    // New state for full GST details
    const [gstDetails, setGstDetails] = useState<any>(null);

    useEffect(() => {
        const fetchUserGst = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.['gst_number']) {
                const gst = user.user_metadata['gst_number'];
                setGstNumber(gst);
                verifyGst(gst);
            }
        };
        fetchUserGst();
    }, []);

    const verifyGst = async (gstToVerify: string) => {
        if (!gstToVerify || gstToVerify.length !== 15) return;

        setIsVerifyingGst(true);
        setExistingCompany(null);
        setIsGstVerified(false);
        setGstDetails(null);

        try {
            // 1. Check if GST already exists in our database
            const { data: existing } = await supabase
                .from("companies")
                .select("name")
                .eq("gst_number", gstToVerify)
                .single();

            if (existing) {
                setExistingCompany(existing);
                setOrgName(existing.name);
                toast.error(`This GST is already registered to ${existing.name}`);
                setIsVerifyingGst(false);
                return;
            }

            // 2. If not exists, fetch from API
            const { data, error } = await supabase.functions.invoke('verify-gst', {
                body: { gst_number: gstToVerify }
            });

            if (error) throw error;

            if (data?.success && data?.data?.organization_name) {
                setOrgName(data.data.organization_name);
                setGstDetails(data.data);
                setIsGstVerified(true);
                toast.success("Company details fetched successfully!");
            } else if (data?.error) {
                toast.error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to verify GST number");
        } finally {
            setIsVerifyingGst(false);
        }
    };

    const handleGstBlur = () => {
        verifyGst(gstNumber);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);

        // 1. Create company
        const { data: company, error: companyError } = await supabase
            .from("companies")
            .insert({
                name: orgName,
                gst_number: gstNumber,
                trade_name: gstDetails?.trade_name,
                gstin_status: gstDetails?.gstin_status,
                taxpayer_type: gstDetails?.taxpayer_type,
                constitution_of_business: gstDetails?.constitution_of_business,
                date_of_registration: gstDetails?.date_of_registration,
                address: gstDetails?.address
            })
            .select()
            .single();

        if (companyError) {
            setBusy(false);
            if (companyError.message.includes("unique constraint") || companyError.message.includes("gst_number")) {
                // Fetch the existing company name
                const { data: existingCompany } = await supabase
                    .from("companies")
                    .select("name")
                    .eq("gst_number", gstNumber)
                    .single();

                if (existingCompany) {
                    toast.error(`Already registered (Registered under: ${existingCompany.name})`);
                } else {
                    toast.error("This GST number is already registered to another company.");
                }
            } else {
                toast.error(companyError.message);
            }
            return;
        }

        // 2. Update profile with company_id and role
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ company_id: company.id, role: "company_admin" })
                .eq("id", user.user.id);

            if (profileError) {
                setBusy(false);
                toast.error(profileError.message);
                return;
            }
        }

        setBusy(false);
        toast.success("Company created successfully!");
        // Force reload to re-run beforeLoad in _authenticated/route.tsx
        window.location.href = "/invoices";
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
            <div className="surface-panel w-full max-w-2xl p-7">
                <h1 className="text-2xl font-semibold">Complete your profile</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Please verify your organization details to continue.
                </p>

                <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="gstNumber">GST Number</Label>
                        <div className="relative">
                            <Input
                                id="gstNumber"
                                type="text"
                                required
                                value={gstNumber}
                                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                                onBlur={handleGstBlur}
                                disabled={isVerifyingGst || busy}
                                maxLength={15}
                            />
                            {isVerifyingGst && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    </div>

                    {existingCompany && (
                        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive border border-destructive/20">
                            <p className="font-semibold text-base mb-1">Already Registered</p>
                            <p>This GST number is already registered to <strong>{existingCompany.name}</strong>. Please sign in with the correct account or contact your administrator.</p>
                        </div>
                    )}

                    {isGstVerified && gstDetails && !existingCompany && (
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                            <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
                                <h3 className="font-semibold text-sm">Verified Company Details</h3>
                                <div className="flex items-center text-emerald-600 text-xs font-medium">
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Verified via GSTIN
                                </div>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Legal Name</p>
                                    <p className="font-medium">{gstDetails.organization_name}</p>
                                </div>
                                {gstDetails.trade_name && (
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Trade Name</p>
                                        <p className="font-medium">{gstDetails.trade_name}</p>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Status</p>
                                    <p className="font-medium">
                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                            {gstDetails.gstin_status}
                                        </span>
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Taxpayer Type</p>
                                    <p className="font-medium">{gstDetails.taxpayer_type}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Business Type</p>
                                    <p className="font-medium">{gstDetails.constitution_of_business}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Registration Date</p>
                                    <p className="font-medium">{gstDetails.date_of_registration}</p>
                                </div>
                                {gstDetails.address && (
                                    <div className="space-y-1 md:col-span-2 pt-2 border-t mt-2">
                                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Principal Place of Business</p>
                                        <p className="font-medium text-muted-foreground">
                                            {[
                                                gstDetails.address.building_name,
                                                gstDetails.address.door_number,
                                                gstDetails.address.street,
                                                gstDetails.address.location,
                                                gstDetails.address.city,
                                                gstDetails.address.dst,
                                                gstDetails.address.state_name,
                                                gstDetails.address.pincode
                                            ].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={busy || !isGstVerified || !!existingCompany}>
                        {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Confirm & Complete Setup
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-muted-foreground"
                        onClick={async () => {
                            await supabase.auth.signOut();
                            navigate({ to: "/auth" });
                        }}
                        disabled={busy}
                    >
                        Sign out and use a different account
                    </Button>
                </form>
            </div>
        </main>
    );
}
