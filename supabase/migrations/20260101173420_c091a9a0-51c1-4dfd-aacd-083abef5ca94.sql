-- Fix Security Definer View issue by dropping the view and recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.vendors_public;

-- Recreate as a regular view (SECURITY INVOKER is default)
CREATE VIEW public.vendors_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  brand_name,
  slug,
  bio,
  logo_url,
  banner_url,
  social_links,
  is_active,
  is_verified,
  created_at
FROM public.vendors
WHERE is_active = true AND is_verified = true;

-- Grant access to the view
GRANT SELECT ON public.vendors_public TO anon, authenticated;