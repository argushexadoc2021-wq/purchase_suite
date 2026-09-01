import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { normalizeLineItems, type InvoiceRecord, type LineItem } from "./invoice-types";

const ACCEPTED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
]);

type UploadInput = { fileName: string; mimeType: string; base64: string };

type UpdateInput = {
  id: string;
  values: {
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
    reviewed: boolean;
  };
};

function mapRow(row: Record<string, unknown>): InvoiceRecord {
  return {
    ...(row as unknown as InvoiceRecord),
    subtotal: row["subtotal"] === null ? null : Number(row["subtotal"]),
    tax_amount: row["tax_amount"] === null ? null : Number(row["tax_amount"]),
    total_amount: row["total_amount"] === null ? null : Number(row["total_amount"]),
    line_items: normalizeLineItems(row["line_items"]),
  };
}

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("invoices")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Invoice not found.");

    let fileUrl = null;
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const signed = await supabaseAdmin.storage
        .from("invoices")
        .createSignedUrl((row as { file_path: string }).file_path, 60 * 30);
      fileUrl = signed.data?.signedUrl ?? null;
    } else {
      fileUrl = "/uploads/" + (row as { file_path: string }).file_path.replace(/[\\/]/g, "_");
    }

    return {
      invoice: mapRow(row as Record<string, unknown>),
      fileUrl,
    };
  });

export const uploadAndExtractInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UploadInput) => {
    if (!input?.base64 || !input.fileName) throw new Error("A file is required.");
    if (!ACCEPTED.has(input.mimeType)) throw new Error("Only PDF or image invoices are supported.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Files must be 10MB or smaller.");

    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const upload = await supabaseAdmin.storage
        .from("invoices")
        .upload(path, bytes, { contentType: data.mimeType, upsert: false });
      if (upload.error) throw new Error(`Upload failed: ${upload.error.message}`);
    } else {
      const fs = await import("fs");
      const pathModule = await import("path");
      const localPath = pathModule.join(
        process.cwd(),
        "public",
        "uploads",
        path.replace(/[\\/]/g, "_"),
      );
      fs.mkdirSync(pathModule.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, bytes);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        file_name: data.fileName,
        file_path: path,
        mime_type: data.mimeType,
        file_size: bytes.byteLength,
        status: "processing",
      })
      .select("*")
      .single();
    if (insertError) throw new Error(insertError.message);

    const invoiceId = (inserted as { id: string }).id;

    try {
      const { extractInvoiceData } = await import("./invoice-extract.server");
      const extracted = await extractInvoiceData({
        base64: data.base64,
        mimeType: data.mimeType,
        fileName: data.fileName,
      });

      const { data: updated, error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "extracted",
          error_message: null,
          vendor_name: extracted.vendor_name,
          vendor_address: extracted.vendor_address,
          vendor_tax_id: extracted.vendor_tax_id,
          customer_name: extracted.customer_name,
          invoice_number: extracted.invoice_number,
          purchase_order: extracted.purchase_order,
          invoice_date: extracted.invoice_date,
          due_date: extracted.due_date,
          currency: extracted.currency,
          subtotal: extracted.subtotal,
          cgst: extracted.cgst,
          sgst: extracted.sgst,
          igst: extracted.igst,
          tax_amount: extracted.tax_amount,
          round_off: extracted.round_off,
          total_amount: extracted.total_amount,
          payment_terms: extracted.payment_terms,
          bank_account_number: extracted.bank_account_number,
          bank_ifsc: extracted.bank_ifsc,
          notes: extracted.notes,
          line_items: extracted.line_items,
          raw_extraction: extracted.raw as never,
        })
        .eq("id", invoiceId)
        .select("*")
        .single();
      if (updateError) throw new Error(updateError.message);
      return mapRow(updated as Record<string, unknown>);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed.";
      const { data: failed } = await supabase
        .from("invoices")
        .update({ status: "failed", error_message: message })
        .eq("id", invoiceId)
        .select("*")
        .single();
      if (failed) return mapRow(failed as Record<string, unknown>);
      throw new Error(message);
    }
  });

export const retryExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Invoice not found.");

    const record = row as { file_path: string; mime_type: string | null; file_name: string };
    let buffer: Uint8Array;
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const download = await supabaseAdmin.storage.from("invoices").download(record.file_path);
      if (download.error || !download.data) throw new Error("The stored file could not be read.");
      buffer = new Uint8Array(await download.data.arrayBuffer());
    } else {
      const fs = await import("fs");
      const pathModule = await import("path");
      const localPath = pathModule.join(
        process.cwd(),
        "public",
        "uploads",
        record.file_path.replace(/[\\/]/g, "_"),
      );
      buffer = new Uint8Array(fs.readFileSync(localPath));
    }
    let binary = "";
    for (const byte of buffer) binary += String.fromCharCode(byte);
    const base64 = btoa(binary);

    try {
      const { extractInvoiceData } = await import("./invoice-extract.server");
      const extracted = await extractInvoiceData({
        base64,
        mimeType: record.mime_type ?? "application/pdf",
        fileName: record.file_name,
      });
      const { data: updated, error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "extracted",
          error_message: null,
          vendor_name: extracted.vendor_name,
          vendor_address: extracted.vendor_address,
          vendor_tax_id: extracted.vendor_tax_id,
          customer_name: extracted.customer_name,
          invoice_number: extracted.invoice_number,
          purchase_order: extracted.purchase_order,
          invoice_date: extracted.invoice_date,
          due_date: extracted.due_date,
          currency: extracted.currency,
          subtotal: extracted.subtotal,
          cgst: extracted.cgst,
          sgst: extracted.sgst,
          igst: extracted.igst,
          tax_amount: extracted.tax_amount,
          round_off: extracted.round_off,
          total_amount: extracted.total_amount,
          payment_terms: extracted.payment_terms,
          bank_account_number: extracted.bank_account_number,
          bank_ifsc: extracted.bank_ifsc,
          notes: extracted.notes,
          line_items: extracted.line_items,
          raw_extraction: extracted.raw as never,
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (updateError) throw new Error(updateError.message);
      return mapRow(updated as Record<string, unknown>);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed.";
      await supabase
        .from("invoices")
        .update({ status: "failed", error_message: message })
        .eq("id", data.id);
      throw new Error(message);
    }
  });

export const updateInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdateInput) => {
    if (!input?.id) throw new Error("Missing invoice id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("invoices")
      .update({
        ...data.values,
        line_items: data.values.line_items as never,
        status: "reviewed",
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(updated as Record<string, unknown>);
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("invoices")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await context.supabase.from("invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    if (row) {
      if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.storage
          .from("invoices")
          .remove([(row as { file_path: string }).file_path]);
      } else {
        try {
          const fs = await import("fs");
          const pathModule = await import("path");
          const localPath = pathModule.join(
            process.cwd(),
            "public",
            "uploads",
            (row as { file_path: string }).file_path.replace(/[\\/]/g, "_"),
          );
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        } catch (e) { }
      }
    }
    return { ok: true };
  });
