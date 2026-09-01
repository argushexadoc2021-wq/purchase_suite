import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  Save,
  RefreshCw,
  FileText,
  CheckCircle,
} from "lucide-react";
import { getInvoice, updateInvoice, retryExtraction } from "@/lib/invoices.functions";
import { LineItem } from "@/lib/invoice-types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  component: InvoiceDetailPage,
});

const statusStyles: Record<string, string> = {
  extracted: "bg-secondary text-secondary-foreground",
  reviewed: "bg-success/15 text-success",
  processing: "bg-accent/20 text-accent-foreground",
  failed: "bg-destructive/15 text-destructive",
};

export default function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchInvoice = useServerFn(getInvoice);
  const saveInvoice = useServerFn(updateInvoice);
  const retry = useServerFn(retryExtraction);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice({ data: { id } }),
  });

  const [form, setForm] = useState({
    vendor_name: "",
    vendor_gstin: "",
    vendor_address: "",
    customer_name: "",
    customer_gstin: "",
    billing_address: "",
    shipping_address: "",
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    po_number: "",
    payment_terms: "",
    currency: "USD",
    subtotal: "",
    discount: "",
    taxable_amount: "",
    cgst: "",
    sgst: "",
    igst: "",
    total_tax: "",
    shipping_charges: "",
    other_charges: "",
    round_off: "",
    grand_total: "",
    payment_status: "",
    bank_account_number: "",
    bank_ifsc: "",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    if (data?.invoice) {
      const inv = data.invoice;
      setForm({
        vendor_name: inv.vendor_name ?? "",
        vendor_gstin: inv.vendor_tax_id ?? "",
        vendor_address: inv.vendor_address ?? "",
        customer_name: inv.customer_name ?? "",
        customer_gstin: "",
        billing_address: "",
        shipping_address: "",
        invoice_number: inv.invoice_number ?? "",
        invoice_date: inv.invoice_date ?? "",
        due_date: inv.due_date ?? "",
        po_number: inv.purchase_order ?? "",
        payment_terms: inv.payment_terms ?? "",
        currency: inv.currency ?? "USD",
        subtotal: inv.subtotal != null ? String(inv.subtotal) : "",
        discount: "",
        taxable_amount: "",
        cgst: inv.cgst != null ? String(inv.cgst) : "",
        sgst: inv.sgst != null ? String(inv.sgst) : "",
        igst: inv.igst != null ? String(inv.igst) : "",
        total_tax: inv.tax_amount != null ? String(inv.tax_amount) : "",
        shipping_charges: "",
        other_charges: "",
        round_off: inv.round_off != null ? String(inv.round_off) : "",
        grand_total: inv.total_amount != null ? String(inv.total_amount) : "",
        payment_status: "",
        bank_account_number: inv.bank_account_number ?? "",
        bank_ifsc: inv.bank_ifsc ?? "",
        notes: inv.notes ?? "",
      });
      setLineItems(inv.line_items || []);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async ({ approve }: { approve: boolean }) => {
      const parsedSubtotal = parseFloat(form.subtotal) || null;
      const parsedTotalTax = parseFloat(form.total_tax) || null;
      const parsedGrandTotal = parseFloat(form.grand_total) || null;

      return saveInvoice({
        data: {
          id,
          values: {
            vendor_name: form.vendor_name || null,
            vendor_address: form.vendor_address || null,
            vendor_tax_id: form.vendor_gstin || null,
            customer_name: form.customer_name || null,
            invoice_number: form.invoice_number || null,
            purchase_order: form.po_number || null,
            invoice_date: form.invoice_date || null,
            due_date: form.due_date || null,
            currency: form.currency || null,
            subtotal: parsedSubtotal,
            cgst: parseFloat(form.cgst) || null,
            sgst: parseFloat(form.sgst) || null,
            igst: parseFloat(form.igst) || null,
            tax_amount: parsedTotalTax,
            round_off: parseFloat(form.round_off) || null,
            total_amount: parsedGrandTotal,
            payment_terms: form.payment_terms || null,
            bank_account_number: form.bank_account_number || null,
            bank_ifsc: form.bank_ifsc || null,
            notes: form.notes || null,
            line_items: lineItems.map((li) => ({
              ...li,
              quantity:
                typeof li.quantity === "number"
                  ? li.quantity
                  : parseFloat(li.quantity as any) || null,
              unit_price:
                typeof li.unit_price === "number"
                  ? li.unit_price
                  : parseFloat(li.unit_price as any) || null,
              amount:
                typeof li.amount === "number" ? li.amount : parseFloat(li.amount as any) || null,
              discount:
                typeof li.discount === "number"
                  ? li.discount
                  : parseFloat(li.discount as any) || null,
              tax_rate:
                typeof li.tax_rate === "number"
                  ? li.tax_rate
                  : parseFloat(li.tax_rate as any) || null,
              tax_amount:
                typeof li.tax_amount === "number"
                  ? li.tax_amount
                  : parseFloat(li.tax_amount as any) || null,
              line_total:
                typeof li.line_total === "number"
                  ? li.line_total
                  : parseFloat(li.line_total as any) || null,
            })),
            reviewed: approve,
          },
        },
      });
    },
    onSuccess: (updatedInvoice) => {
      toast.success("Invoice saved successfully.");
      queryClient.setQueryData(["invoice", id], {
        invoice: updatedInvoice,
        fileUrl: data?.fileUrl,
      });
    },
    onError: (err: Error) => {
      toast.error(`Save failed: ${err.message}`);
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => retry({ data: { id } }),
    onSuccess: () => {
      toast.success("Invoice re-processing...");
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
    },
    onError: (err: Error) => {
      toast.error(`Retry failed: ${err.message}`);
    },
  });

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (index: number, field: string, value: unknown) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as LineItem;
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        item_name: "",
        description: "",
        hsn_sac: "",
        quantity: null,
        unit: "",
        unit_price: null,
        discount: null,
        tax_rate: null,
        tax_amount: null,
        line_total: null,
        amount: null,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="p-6">
          <Skeleton className="h-8 w-1/4 mb-6" />
          <div className="flex gap-6 h-[80vh]">
            <Skeleton className="w-1/2 rounded-xl" />
            <Skeleton className="w-1/2 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.invoice) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="p-6 max-w-2xl mx-auto text-center mt-20">
          <FileText className="mx-auto size-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold">Invoice Not Found</h2>
          <p className="text-muted-foreground mt-2">Could not retrieve invoice details.</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate({ to: "/invoices" })}>
            <ArrowLeft className="mr-2 size-4" /> Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  const { invoice, fileUrl } = data;
  const isImage = invoice.mime_type?.startsWith("image/");
  const isProcessing = invoice.status === "processing";
  const isFailed = invoice.status === "failed";

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <AppHeader />

      <div className="border-b px-6 py-4 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/invoices" })}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-3">
              {invoice.file_name}
              <Badge variant="secondary" className={statusStyles[invoice.status] ?? "bg-muted"}>
                {invoice.status}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Uploaded on {new Date(invoice.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isFailed && (
            <Button
              variant="outline"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate()}
            >
              {retryMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Retry Extraction
            </Button>
          )}

          <Button
            variant="secondary"
            disabled={saveMutation.isPending || isProcessing}
            onClick={() => saveMutation.mutate({ approve: false })}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save
          </Button>

          <Button
            disabled={saveMutation.isPending || isProcessing}
            onClick={() => saveMutation.mutate({ approve: true })}
          >
            <CheckCircle className="mr-2 size-4" />
            Save & Approve
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-1/2 border-r bg-muted/20 flex flex-col">
          {fileUrl ? (
            <div className="flex-1 p-4 relative h-full">
              {isImage ? (
                <img
                  src={fileUrl}
                  alt={invoice.file_name}
                  className="w-full h-full object-contain rounded-md"
                />
              ) : (
                <object
                  data={fileUrl}
                  type="application/pdf"
                  className="w-full h-full rounded-md shadow-sm"
                >
                  <p className="text-muted-foreground text-center pt-20">
                    PDF cannot be displayed.{" "}
                    <a href={fileUrl} className="text-primary underline">
                      Download
                    </a>
                  </p>
                </object>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3">
              <Loader2 className="size-8 animate-spin" />
              <p>Loading document securely...</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="w-1/2 overflow-y-auto p-6 bg-card pb-20">
          {isProcessing ? (
            <div className="py-20 text-center">
              <Loader2 className="mx-auto size-10 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-medium">Extracting data...</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                AI is currently processing this invoice. Once it is ready, the data will appear
                below. Check back in a few seconds.
              </p>
              <Button className="mt-6" variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 size-4" /> Refresh Status
              </Button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-10">
              <Section title="1. Vendor Information">
                <Field
                  label="Vendor Name (Company Name)"
                  value={form.vendor_name}
                  onChange={(v) => handleFieldChange("vendor_name", v)}
                />
                <Field
                  label="Vendor GSTIN"
                  value={form.vendor_gstin}
                  onChange={(v) => handleFieldChange("vendor_gstin", v)}
                />
                <Field
                  label="Vendor Address"
                  value={form.vendor_address}
                  onChange={(v) => handleFieldChange("vendor_address", v)}
                  fullWidth
                />
              </Section>

              <Section title="2. Invoice Information">
                <Field
                  label="Invoice Number"
                  value={form.invoice_number}
                  onChange={(v) => handleFieldChange("invoice_number", v)}
                />
                <Field
                  label="Invoice Date"
                  value={form.invoice_date}
                  onChange={(v) => handleFieldChange("invoice_date", v)}
                  type="date"
                />
              </Section>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">3. Line Items</h3>
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-48">Part Name</TableHead>
                        <TableHead className="w-24">Quantity</TableHead>
                        <TableHead className="w-24">Discount</TableHead>
                        <TableHead className="w-24">Tax</TableHead>
                        <TableHead className="w-24">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground py-6"
                          >
                            No line items extracted.
                          </TableCell>
                        </TableRow>
                      )}
                      {lineItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input
                              className="h-8 text-sm px-2"
                              value={item.item_name || item.description || ""}
                              onChange={(e) =>
                                handleLineItemChange(idx, "item_name", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-sm px-2"
                              type="number"
                              value={item.quantity ?? ""}
                              onChange={(e) =>
                                handleLineItemChange(idx, "quantity", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-sm px-2"
                              type="number"
                              value={item.discount ?? ""}
                              onChange={(e) =>
                                handleLineItemChange(idx, "discount", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-sm px-2"
                              type="number"
                              value={item.tax_amount ?? ""}
                              onChange={(e) =>
                                handleLineItemChange(idx, "tax_amount", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-sm px-2"
                              type="number"
                              value={item.amount ?? item.line_total ?? ""}
                              onChange={(e) => {
                                handleLineItemChange(idx, "amount", e.target.value);
                                handleLineItemChange(idx, "line_total", e.target.value);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeLineItem(idx)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                  className="mt-2 text-primary"
                >
                  <Plus className="mr-2 size-4" /> Add Item
                </Button>
              </div>

              <Section title="4. Financial Details">
                <Field
                  label="CGST"
                  type="number"
                  value={form.cgst}
                  onChange={(v) => handleFieldChange("cgst", v)}
                />
                <Field
                  label="SGST"
                  type="number"
                  value={form.sgst}
                  onChange={(v) => handleFieldChange("sgst", v)}
                />
                <Field
                  label="IGST"
                  type="number"
                  value={form.igst}
                  onChange={(v) => handleFieldChange("igst", v)}
                />
                <Field
                  label="Round Off"
                  type="number"
                  value={form.round_off}
                  onChange={(v) => handleFieldChange("round_off", v)}
                />
                <Field
                  label="Total Amount"
                  type="number"
                  value={form.grand_total}
                  onChange={(v) => handleFieldChange("grand_total", v)}
                  fullWidth
                />
              </Section>

              <Section title="5. Bank Details">
                <Field
                  label="Bank Account Number"
                  value={form.bank_account_number}
                  onChange={(v) => handleFieldChange("bank_account_number", v)}
                />
                <Field
                  label="Bank IFSC Code"
                  value={form.bank_ifsc}
                  onChange={(v) => handleFieldChange("bank_ifsc", v)}
                />
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg border-b pb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  fullWidth = false,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  fullWidth?: boolean;
  type?: string;
}) {
  return (
    <div className={fullWidth ? "col-span-1 md:col-span-2" : ""}>
      <Label className="text-sm font-medium mb-1.5 block text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
    </div>
  );
}
