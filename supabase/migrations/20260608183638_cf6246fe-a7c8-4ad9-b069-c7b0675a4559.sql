REVOKE EXECUTE ON FUNCTION public.admin_bulk_update_orders(uuid[], public.order_status, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_update_orders(uuid[], public.order_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_update_orders(uuid[], public.order_status, text) TO service_role;