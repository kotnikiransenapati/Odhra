
CREATE OR REPLACE FUNCTION public.get_trending_products(_days int DEFAULT 7, _limit int DEFAULT 12)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  price numeric,
  compare_at_price numeric,
  primary_image text,
  vendor_name text,
  vendor_slug text,
  viewer_count bigint,
  view_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.title, p.slug, p.price, p.compare_at_price,
    (SELECT pi.url FROM public.product_images pi
       WHERE pi.product_id = p.id
       ORDER BY pi.is_primary DESC NULLS LAST LIMIT 1) AS primary_image,
    v.brand_name AS vendor_name,
    v.slug AS vendor_slug,
    COUNT(DISTINCT r.user_id) AS viewer_count,
    SUM(r.view_count)::bigint AS view_count
  FROM public.recently_viewed_products r
  JOIN public.products p ON p.id = r.product_id AND p.is_active = true
  LEFT JOIN public.vendors v ON v.id = p.vendor_id
  WHERE r.viewed_at >= now() - make_interval(days => GREATEST(_days, 1))
  GROUP BY p.id, v.brand_name, v.slug
  ORDER BY viewer_count DESC, view_count DESC
  LIMIT GREATEST(LEAST(_limit, 50), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_products(int, int) TO anon, authenticated;
