-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gst_number TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Update profiles table
ALTER TABLE public.profiles
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'company_admin', 'user'));

-- Update invoices table
ALTER TABLE public.invoices
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

-- Companies Policies
CREATE POLICY "Super admins can do everything on companies" ON public.companies
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT TO authenticated
USING (
  id = (SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid())
);

-- Drop existing profiles policy
DROP POLICY IF EXISTS "profiles_own" ON public.profiles;

-- Profiles Policies
CREATE POLICY "Super admins can view all profiles" ON public.profiles
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'super_admin'
);

CREATE POLICY "Company admins can view and manage profiles in their company" ON public.profiles
FOR ALL TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid())
  AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'company_admin'
);

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- Drop existing invoices policy
DROP POLICY IF EXISTS "invoices_own" ON public.invoices;

-- Invoices Policies
CREATE POLICY "Super admins can view all invoices" ON public.invoices
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'super_admin'
);

CREATE POLICY "Users can view and manage invoices in their company" ON public.invoices
FOR ALL TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid())
);
