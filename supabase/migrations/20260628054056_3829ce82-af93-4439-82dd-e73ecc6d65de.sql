GRANT SELECT, INSERT ON public.batch_stock_operations TO authenticated;
GRANT ALL ON public.batch_stock_operations TO service_role;

GRANT SELECT ON public.inventory_forecasts TO authenticated;
GRANT ALL ON public.inventory_forecasts TO service_role;