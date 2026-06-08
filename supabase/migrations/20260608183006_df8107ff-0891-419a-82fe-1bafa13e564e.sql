GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_notes TO authenticated;
GRANT ALL ON public.order_notes TO service_role;

GRANT SELECT, INSERT ON public.order_activity_log TO authenticated;
GRANT ALL ON public.order_activity_log TO service_role;