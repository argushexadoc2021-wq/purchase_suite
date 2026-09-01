-- Add new fields for detailed invoice extraction
ALTER TABLE invoices
ADD COLUMN cgst NUMERIC,
ADD COLUMN sgst NUMERIC,
ADD COLUMN igst NUMERIC,
ADD COLUMN round_off NUMERIC,
ADD COLUMN bank_account_number TEXT,
ADD COLUMN bank_ifsc TEXT;
