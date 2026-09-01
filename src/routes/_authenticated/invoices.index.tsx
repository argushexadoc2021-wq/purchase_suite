import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  Loader2,
  FileText,
  Search,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Camera,
} from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listInvoices,
  uploadAndExtractInvoice,
  deleteInvoice,
  retryExtraction,
} from "@/lib/invoices.functions";
import { ACCEPTED_TYPES, MAX_FILE_BYTES, formatMoney } from "@/lib/invoice-types";

export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({
    meta: [
      { title: "Invoice CRM — Ledgerly" },
      {
        name: "description",
        content:
          "Upload invoices, watch AI extract the data, and track every vendor bill in one place.",
      },
      { property: "og:title", content: "Invoice CRM — Ledgerly" },
      {
        property: "og:description",
        content: "Your uploaded invoices with AI-extracted totals, dates and vendors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicesPage,
});

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

const statusStyles: Record<string, string> = {
  extracted: "bg-secondary text-secondary-foreground",
  reviewed: "bg-success/15 text-success",
  processing: "bg-accent/20 text-accent-foreground",
  failed: "bg-destructive/15 text-destructive",
};

function InvoicesPage() {
  const queryClient = useQueryClient();
  const fetchInvoices = useServerFn(listInvoices);
  const upload = useServerFn(uploadAndExtractInvoice);
  const remove = useServerFn(deleteInvoice);
  const retry = useServerFn(retryExtraction);

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: () => fetchInvoices(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Invoice deleted");
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => retry({ data: { id } }),
    onSuccess: () => {
      toast.success("Invoice re-processed");
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const list = Array.from(files);

    for (const file of list) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only PDF or image invoices are supported.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name}: files must be 10MB or smaller.`);
        continue;
      }

      setPending((current) => [...current, file.name]);
      try {
        const base64 = await toBase64(file);
        const result = await upload({
          data: { fileName: file.name, mimeType: file.type, base64 },
        });
        if (result.status === "failed") {
          toast.error(`${file.name}: ${result.error_message ?? "extraction failed"}`);
        } else {
          toast.success(`${file.name} processed`);
        }
        void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `${file.name} failed to upload.`);
      } finally {
        setPending((current) => current.filter((name) => name !== file.name));
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const invoices = invoicesQuery.data ?? [];

  const filtered = useMemo(() => {
    let result = invoices;

    if (statusFilter !== "all") {
      result = result.filter((invoice) => invoice.status === statusFilter);
    }

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((invoice) =>
        [invoice.vendor_name, invoice.invoice_number, invoice.file_name, invoice.customer_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      );
    }

    return result;
  }, [invoices, search, statusFilter]);

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, invoice) => sum + (invoice.total_amount ?? 0), 0);
    return {
      count: invoices.length,
      total,
      currency: invoices.find((invoice) => invoice.currency)?.currency ?? "USD",
      needsReview: invoices.filter((invoice) => invoice.status === "extracted").length,
      failed: invoices.filter((invoice) => invoice.status === "failed").length,
    };
  }, [invoices]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Invoices</h1>
        <p className="mt-2 text-muted-foreground">
          Drop in PDFs or photos of invoices — AI fills the data entry form for you.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {[
            ["Invoices", String(stats.count)],
            ["Total value", formatMoney(stats.total, stats.currency)],
            ["Awaiting review", String(stats.needsReview)],
            ["Failed", String(stats.failed)],
          ].map(([label, value]) => (
            <div key={label} className="surface-panel px-5 py-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="mt-2 font-display text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFiles(event.dataTransfer.files);
          }}
          className={`mt-6 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${dragging ? "border-primary bg-secondary/60" : "border-border bg-card"
            }`}
        >
          <UploadCloud className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-medium">Drag invoices here, or pick files</p>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF, PNG, JPG or WEBP · up to 10MB each · multiple files at once
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
            <Button onClick={() => inputRef.current?.click()}>
              Select invoices
            </Button>
            <Button variant="secondary" onClick={() => cameraRef.current?.click()}>
              <Camera className="mr-2 size-4" />
              Take Photo
            </Button>
          </div>

          {pending.length > 0 ? (
            <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
              {pending.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="truncate">{name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">reading…</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor, number, file…"
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="extracted">Extracted</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="surface-panel mt-4 overflow-hidden">
          {invoicesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading invoices…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No invoices yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload your first invoice above to see extracted data here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Invoice date</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    <TableCell className="max-w-[220px]">
                      <span className="font-medium hover:text-primary">
                        {invoice.vendor_name ?? invoice.file_name}
                      </span>
                      <p className="truncate text-xs text-muted-foreground">{invoice.file_name}</p>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoice_number ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoice_date ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{invoice.due_date ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMoney(invoice.total_amount, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusStyles[invoice.status] ?? "bg-muted"}
                      >
                        {invoice.status === "failed" ? (
                          <AlertTriangle className="mr-1 size-3" />
                        ) : null}
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {invoice.status === "failed" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Retry extraction"
                            disabled={retryMutation.isPending}
                            onClick={() => retryMutation.mutate(invoice.id)}
                          >
                            <RefreshCw className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete invoice"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(invoice.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedInvoice?.vendor_name ?? selectedInvoice?.file_name}</DialogTitle>
            <DialogDescription>
              Extracted invoice information
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
                <p className="font-mono">{selectedInvoice.invoice_number ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="font-mono font-semibold">
                  {formatMoney(selectedInvoice.total_amount, selectedInvoice.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invoice Date</p>
                <p className="font-mono">{selectedInvoice.invoice_date ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                <p className="font-mono">{selectedInvoice.due_date ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer Name</p>
                <p>{selectedInvoice.customer_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant="secondary" className={statusStyles[selectedInvoice.status] ?? "bg-muted"}>
                  {selectedInvoice.status}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between items-center">
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
            {selectedInvoice && (
              <Link to="/invoices/$id" params={{ id: selectedInvoice.id }}>
                <Button>
                  <FileText className="mr-2 size-4" />
                  View Full Details & Image
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
