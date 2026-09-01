export type LineItem = {
  item_name?: string | null;
  description: string;
  hsn_sac?: string | null;
  quantity: number | null;
  unit?: string | null;
  unit_price: number | null;
  discount?: number | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
  line_total?: number | null;
  amount: number | null;
};

export type InvoiceRecord = {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  status: string;
  error_message: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  vendor_tax_id: string | null;
  customer_name: string | null;
  invoice_number: string | null;
  purchase_order: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string | null;
  subtotal: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  tax_amount: number | null;
  round_off: number | null;
  total_amount: number | null;
  payment_terms: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  notes: string | null;
  line_items: LineItem[];
  raw_extraction: any;
  reviewed: boolean;
  created_at: string;
  updated_at: string;
};

export const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
];

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function formatMoney(value: number | null, currency: string | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency && currency.length === 3 ? currency : "USD",
    }).format(value);
  } catch {
    return `${value}`;
  }
}

export function normalizeLineItems(input: unknown): LineItem[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      description: String(item["description"] ?? item["item"] ?? ""),
      quantity: toNumber(item["quantity"]),
      unit_price: toNumber(item["unit_price"] ?? item["unitPrice"] ?? item["price"]),
      amount: toNumber(item["amount"] ?? item["total"] ?? item["line_total"]),
    };
  });
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value)
    .replace(/[^0-9.,-]/g, "")
    .replace(/,(?=\d{3}\b)/g, "");
  const parsed = Number.parseFloat(cleaned.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
