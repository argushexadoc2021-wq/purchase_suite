import { normalizeLineItems, toNumber, type LineItem } from "./invoice-types";

const GATEWAY_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

const SYSTEM_PROMPT = `You are an expert accounts-payable data-entry assistant.
You read a single invoice (any layout, any language, scanned or digital) and return structured json.

Rules:
- Return ONLY a json object, no prose, no markdown fences.
- Use this exact json shape:
{
  "vendor_name": string|null,
  "vendor_address": string|null,
  "vendor_tax_id": string|null,
  "customer_name": string|null,
  "invoice_number": string|null,
  "purchase_order": string|null,
  "invoice_date": "YYYY-MM-DD"|null,
  "due_date": "YYYY-MM-DD"|null,
  "currency": "ISO 4217 code"|null,
  "subtotal": number|null,
  "cgst": number|null,
  "sgst": number|null,
  "igst": number|null,
  "tax_amount": number|null,
  "round_off": number|null,
  "total_amount": number|null,
  "payment_terms": string|null,
  "bank_account_number": string|null,
  "bank_ifsc": string|null,
  "notes": string|null,
  "line_items": [{ "item_name": string (use this for Part Name or Description), "description": string|null, "hsn_sac": string|null, "quantity": number|null, "unit": string|null, "unit_price": number|null, "discount": number|null, "tax_rate": number|null, "tax_amount": number|null, "line_total": number|null }]
}
- Numbers must be plain numbers (no currency symbols, no thousands separators).
- Normalize every date to YYYY-MM-DD. If a year is missing, infer it from context.
- Never invent values. Use null when a field is genuinely absent.
- Put anything useful but unmapped into "notes".`;

export type ExtractedInvoice = {
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
  raw: unknown;
};

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error("The AI response could not be read as invoice data.");
  }
}

function cleanDate(value: unknown): string | null {
  if (!value) return null;
  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const trimmed = text.trim();
  return trimmed.length ? trimmed : null;
}

export async function extractInvoiceData(params: {
  base64: string;
  mimeType: string;
  fileName: string;
}): Promise<ExtractedInvoice> {
  const apiKey = process.env["OPENAI_API_KEY"];

  if (!apiKey) {
    console.warn("OPENAI_API_KEY is missing. Returning mock invoice data for local testing.");
    // Return a 2 second delay to simulate extraction
    await new Promise((res) => setTimeout(res, 2000));
    return {
      vendor_name: "Mock Vendor Inc.",
      vendor_address: "123 Development St.",
      vendor_tax_id: "GST12345XYZ",
      customer_name: "John Doe",
      invoice_number: "INV-" + Math.floor(Math.random() * 10000),
      purchase_order: "PO-MOCK-99",
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      currency: "USD",
      subtotal: 1000,
      cgst: 50,
      sgst: 50,
      igst: 0,
      tax_amount: 100,
      round_off: 0,
      total_amount: 1100,
      payment_terms: "Net 30",
      bank_account_number: "1234567890",
      bank_ifsc: "HDFC0001234",
      notes: "This is a mock extraction because OPENAI_API_KEY is missing in .env.",
      line_items: [
        {
          item_name: "Mock Service A",
          description: "Web Development",
          hsn_sac: "998311",
          quantity: 1,
          unit: "hr",
          unit_price: 1000,
          discount: 0,
          tax_rate: 10,
          tax_amount: 100,
          line_total: 1000,
          amount: 1000,
        },
      ],
      raw: { mock: true },
    };
  }

  const dataUrl = `data:${params.mimeType};base64,${params.base64}`;
  const filePart =
    params.mimeType === "application/pdf"
      ? { type: "file", file: { filename: params.fileName, file_data: dataUrl } }
      : { type: "image_url", image_url: { url: dataUrl } };

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract every field from this invoice and return the json object described above.",
            },
            filePart,
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      throw new Error("AI rate limit reached. Please wait a moment and try again.");
    }
    if (response.status === 402) {
      throw new Error("AI credits are exhausted for this workspace. Add credits to continue.");
    }
    if (response.status === 403) {
      throw new Error("AI access is blocked for this workspace by an admin setting.");
    }
    console.error("AI gateway error", response.status, body.slice(0, 800));
    throw new Error(`Invoice reading failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("The AI returned an empty result for this file.");

  const data = parseJson(content);

  return {
    vendor_name: cleanText(data["vendor_name"]),
    vendor_address: cleanText(data["vendor_address"]),
    vendor_tax_id: cleanText(data["vendor_tax_id"]),
    customer_name: cleanText(data["customer_name"]),
    invoice_number: cleanText(data["invoice_number"]),
    purchase_order: cleanText(data["purchase_order"]),
    invoice_date: cleanDate(data["invoice_date"]),
    due_date: cleanDate(data["due_date"]),
    currency: cleanText(data["currency"])?.toUpperCase().slice(0, 3) ?? null,
    subtotal: toNumber(data["subtotal"]),
    cgst: toNumber(data["cgst"]),
    sgst: toNumber(data["sgst"]),
    igst: toNumber(data["igst"]),
    tax_amount: toNumber(data["tax_amount"]),
    round_off: toNumber(data["round_off"]),
    total_amount: toNumber(data["total_amount"]),
    payment_terms: cleanText(data["payment_terms"]),
    bank_account_number: cleanText(data["bank_account_number"]),
    bank_ifsc: cleanText(data["bank_ifsc"]),
    notes: cleanText(data["notes"]),
    line_items: normalizeLineItems(data["line_items"]),
    raw: data,
  };
}
