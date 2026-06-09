GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_waitlist TO authenticated;
GRANT ALL ON public.product_waitlist TO service_role;

CREATE INDEX IF NOT EXISTS idx_product_waitlist_due_unnotified
ON public.product_waitlist (product_id, created_at)
WHERE notified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_active_stock
ON public.products (id, stock)
WHERE is_active = true AND stock > 0;

CREATE OR REPLACE FUNCTION public.get_due_back_in_stock_waitlist(_limit integer DEFAULT 200)
RETURNS TABLE (
  waitlist_id uuid,
  user_id uuid,
  email text,
  product_id uuid,
  title text,
  slug text,
  stock integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.id AS waitlist_id,
    w.user_id,
    w.email,
    p.id AS product_id,
    p.title,
    p.slug,
    p.stock
  FROM public.product_waitlist w
  JOIN public.products p ON p.id = w.product_id
  WHERE w.notified_at IS NULL
    AND p.is_active = true
    AND p.stock > 0
  ORDER BY w.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 200), 1), 500);
$$;

REVOKE ALL ON FUNCTION public.get_due_back_in_stock_waitlist(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_due_back_in_stock_waitlist(integer) TO service_role;