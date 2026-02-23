
-- Create a security-definer function to check if a vendor is active
-- This bypasses RLS so the products policy can verify vendor status
CREATE OR REPLACE FUNCTION public.is_vendor_active(vendor_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors
    WHERE id = vendor_id AND is_active = true
  );
$$;

-- Drop the old products SELECT policy that references vendors table directly
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Recreate using the security-definer function instead
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (
  is_active = true
  AND public.is_vendor_active(vendor_id)
);
