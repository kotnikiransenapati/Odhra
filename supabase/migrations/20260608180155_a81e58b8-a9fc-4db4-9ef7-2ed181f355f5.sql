GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT ON public.vendors_public TO anon, authenticated;
GRANT ALL ON public.vendors_public TO service_role;

GRANT SELECT ON public.product_associations TO anon, authenticated;
GRANT ALL ON public.product_associations TO service_role;

GRANT SELECT ON public.product_variant_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variant_options TO authenticated;
GRANT ALL ON public.product_variant_options TO service_role;

GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

GRANT SELECT ON public.price_history TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.price_history TO service_role;