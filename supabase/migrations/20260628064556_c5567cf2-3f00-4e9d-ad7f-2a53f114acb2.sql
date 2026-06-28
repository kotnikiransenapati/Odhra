
-- =========================================================
-- C1: Tier pricing engine + MOQ/pack catalog
-- =========================================================
CREATE TABLE IF NOT EXISTS public.wholesale_product_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  min_order_qty integer NOT NULL DEFAULT 1 CHECK (min_order_qty > 0),
  pack_size integer NOT NULL DEFAULT 1 CHECK (pack_size > 0),
  max_order_qty integer,
  lead_time_days integer NOT NULL DEFAULT 2,
  hsn_code text,
  gst_rate numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wholesale_product_settings TO anon, authenticated;
GRANT ALL ON public.wholesale_product_settings TO service_role;
ALTER TABLE public.wholesale_product_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wps_public_read" ON public.wholesale_product_settings FOR SELECT USING (true);
CREATE POLICY "wps_admin_write" ON public.wholesale_product_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.wholesale_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'standard', -- maps to wholesaler_accounts.tier
  min_qty integer NOT NULL CHECK (min_qty > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, tier, min_qty)
);

CREATE INDEX IF NOT EXISTS idx_wpt_product_tier_qty
  ON public.wholesale_price_tiers (product_id, tier, min_qty DESC);

GRANT SELECT ON public.wholesale_price_tiers TO anon, authenticated;
GRANT ALL ON public.wholesale_price_tiers TO service_role;
ALTER TABLE public.wholesale_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wpt_public_read" ON public.wholesale_price_tiers FOR SELECT USING (true);
CREATE POLICY "wpt_admin_write" ON public.wholesale_price_tiers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: resolve effective wholesale unit price for (product, tier, qty)
CREATE OR REPLACE FUNCTION public.get_wholesale_unit_price(
  _product_id uuid,
  _tier text,
  _qty integer
) RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unit_price
  FROM public.wholesale_price_tiers
  WHERE product_id = _product_id
    AND tier IN (_tier, 'standard')
    AND min_qty <= GREATEST(_qty, 1)
  ORDER BY (tier = _tier) DESC, min_qty DESC
  LIMIT 1;
$$;

-- =========================================================
-- C2: Bulk carts, RFQ quotes, order approval
-- =========================================================
CREATE TABLE IF NOT EXISTS public.wholesale_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.wholesaler_accounts(id) ON DELETE SET NULL,
  po_number text,
  requested_delivery_date date,
  shipping_address jsonb,
  notes text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','submitted','approved','rejected','converted','cancelled')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_total numeric(12,2) NOT NULL DEFAULT 0,
  grand_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_carts TO authenticated;
GRANT ALL ON public.wholesale_carts TO service_role;
ALTER TABLE public.wholesale_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wc_owner_all" ON public.wholesale_carts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wc_admin_read" ON public.wholesale_carts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.wholesale_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.wholesale_carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  qty integer NOT NULL CHECK (qty > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  gst_rate numeric(5,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, variant_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_cart_items TO authenticated;
GRANT ALL ON public.wholesale_cart_items TO service_role;
ALTER TABLE public.wholesale_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wci_owner_all" ON public.wholesale_cart_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.wholesale_carts c
    WHERE c.id = cart_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wholesale_carts c
    WHERE c.id = cart_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "wci_admin_read" ON public.wholesale_cart_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RFQ quotes
CREATE TABLE IF NOT EXISTS public.wholesale_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE
    DEFAULT ('Q-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.wholesaler_accounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','responded','accepted','rejected','expired','converted')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_total numeric(12,2) NOT NULL DEFAULT 0,
  grand_total numeric(12,2) NOT NULL DEFAULT 0,
  customer_notes text,
  admin_notes text,
  valid_until date,
  responded_at timestamptz,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.wholesale_quotes TO authenticated;
GRANT ALL ON public.wholesale_quotes TO service_role;
ALTER TABLE public.wholesale_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wq_owner_read" ON public.wholesale_quotes FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wq_owner_insert" ON public.wholesale_quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wq_owner_update_draft" ON public.wholesale_quotes FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('draft','responded'))
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wq_admin_update" ON public.wholesale_quotes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.wholesale_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.wholesale_quotes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  qty integer NOT NULL CHECK (qty > 0),
  requested_unit_price numeric(12,2),
  approved_unit_price numeric(12,2),
  gst_rate numeric(5,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_quote_items TO authenticated;
GRANT ALL ON public.wholesale_quote_items TO service_role;
ALTER TABLE public.wholesale_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wqi_owner_all" ON public.wholesale_quote_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.wholesale_quotes q
    WHERE q.id = quote_id AND (q.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wholesale_quotes q
    WHERE q.id = quote_id AND (q.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- Order approval workflow (credit-gated wholesale orders)
CREATE TABLE IF NOT EXISTS public.wholesale_order_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES public.wholesale_carts(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  account_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  requested_amount numeric(12,2) NOT NULL,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  outstanding_balance numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','escalated','cancelled')),
  reason text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_woa_status ON public.wholesale_order_approvals (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.wholesale_order_approvals TO authenticated;
GRANT ALL ON public.wholesale_order_approvals TO service_role;
ALTER TABLE public.wholesale_order_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "woa_owner_read" ON public.wholesale_order_approvals FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.wholesaler_accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );
CREATE POLICY "woa_admin_write" ON public.wholesale_order_approvals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_wholesale_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wholesale_product_settings','wholesale_price_tiers',
    'wholesale_carts','wholesale_cart_items',
    'wholesale_quotes','wholesale_order_approvals'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_touch ON public.%1$s;
       CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.tg_wholesale_touch_updated_at();', t);
  END LOOP;
END $$;
