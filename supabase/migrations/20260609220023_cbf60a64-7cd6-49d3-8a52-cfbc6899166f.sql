
CREATE TABLE IF NOT EXISTS public.favorite_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  notify_new_products boolean NOT NULL DEFAULT true,
  notify_sales boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vendor_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_vendors TO authenticated;
GRANT ALL ON public.favorite_vendors TO service_role;

ALTER TABLE public.favorite_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own favorite vendors"
  ON public.favorite_vendors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own favorite vendors"
  ON public.favorite_vendors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own favorite vendors"
  ON public.favorite_vendors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own favorite vendors"
  ON public.favorite_vendors FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fav_vendors_user ON public.favorite_vendors (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fav_vendors_vendor ON public.favorite_vendors (vendor_id);
