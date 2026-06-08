REVOKE ALL ON FUNCTION public.refresh_product_associations(timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_product_associations(timestamptz, integer) FROM anon;
REVOKE ALL ON FUNCTION public.refresh_product_associations(timestamptz, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_product_associations(timestamptz, integer) TO service_role;