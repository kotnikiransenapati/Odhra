
CREATE TABLE IF NOT EXISTS public.recently_viewed_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  view_count integer NOT NULL DEFAULT 1,
  source text,
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed_products TO authenticated;
GRANT ALL ON public.recently_viewed_products TO service_role;

ALTER TABLE public.recently_viewed_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recently viewed"
  ON public.recently_viewed_products FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own recently viewed"
  ON public.recently_viewed_products FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own recently viewed"
  ON public.recently_viewed_products FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own recently viewed"
  ON public.recently_viewed_products FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rvp_user_viewed
  ON public.recently_viewed_products (user_id, viewed_at DESC);

-- Upsert helper: increments view_count + refreshes viewed_at, trims history to 50.
CREATE OR REPLACE FUNCTION public.track_product_view(_product_id uuid, _source text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.recently_viewed_products (user_id, product_id, source)
  VALUES (_uid, _product_id, _source)
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET
    viewed_at = now(),
    view_count = public.recently_viewed_products.view_count + 1,
    source = COALESCE(EXCLUDED.source, public.recently_viewed_products.source);

  -- Trim to last 50 entries per user
  DELETE FROM public.recently_viewed_products
  WHERE user_id = _uid
    AND id NOT IN (
      SELECT id FROM public.recently_viewed_products
      WHERE user_id = _uid
      ORDER BY viewed_at DESC
      LIMIT 50
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_product_view(uuid, text) TO authenticated;
