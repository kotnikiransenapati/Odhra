
REVOKE EXECUTE ON FUNCTION public.track_product_view(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_product_view(uuid, text) TO authenticated;
