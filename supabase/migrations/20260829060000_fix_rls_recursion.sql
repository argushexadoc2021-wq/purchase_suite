-- Fix for infinite recursion in RLS policies and missing insert/update policies

-- 1. Create SECURITY DEFINER functions to bypass RLS when checking roles/company
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Drop the existing recursive policies
DROP POLICY IF EXISTS "Super admins can do everything on companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create a company" ON public.companies;

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can view and manage profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Super admins can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view and manage invoices in their company" ON public.invoices;

-- 3. Recreate policies using the new functions
-- Companies
CREATE POLICY "Super admins can do everything on companies" ON public.companies
FOR ALL TO authenticated
USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT TO authenticated
USING (id = public.get_user_company_id());

CREATE POLICY "Authenticated users can create a company" ON public.companies
FOR INSERT TO authenticated
WITH CHECK (true);

-- Profiles
CREATE POLICY "Super admins can view all profiles" ON public.profiles
FOR ALL TO authenticated
USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Company admins can view and manage profiles in their company" ON public.profiles
FOR ALL TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.get_user_role() = 'company_admin'
);

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- Invoices
CREATE POLICY "Super admins can view all invoices" ON public.invoices
FOR ALL TO authenticated
USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Users can view and manage invoices in their company" ON public.invoices
FOR ALL TO authenticated
USING (company_id = public.get_user_company_id());
