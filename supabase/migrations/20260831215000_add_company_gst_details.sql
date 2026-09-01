-- Add new columns to companies table to store full GST details
ALTER TABLE public.companies
ADD COLUMN trade_name TEXT,
ADD COLUMN gstin_status TEXT,
ADD COLUMN taxpayer_type TEXT,
ADD COLUMN constitution_of_business TEXT,
ADD COLUMN date_of_registration TEXT,
ADD COLUMN address JSONB;
