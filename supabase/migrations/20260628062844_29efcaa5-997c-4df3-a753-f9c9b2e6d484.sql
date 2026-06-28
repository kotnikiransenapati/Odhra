
-- VGS1: Promoted Listings
CREATE TABLE IF NOT EXISTS public.promoted_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  slot text NOT NULL DEFAULT 'search' CHECK (slot IN ('search','category','home','recommendation')),
  bid_cpc numeric NOT NULL CHECK (bid_cpc > 0),
  daily_budget numeric NOT NULL CHECK (daily_budget > 0),
  total_budget numeric,
  spent_today numeric NOT NULL DEFAULT 0,
  spent_total numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','depleted','archived')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  last_reset_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_promoted_slot_status ON public.promoted_listings (slot, status);
CREATE INDEX IF NOT EXISTS idx_promoted_vendor ON public.promoted_listings (vendor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promoted_listings TO authenticated;
GRANT SELECT ON public.promoted_listings TO anon;
GRANT ALL ON public.promoted_listings TO service_role;
ALTER TABLE public.promoted_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active promotions" ON public.promoted_listings
  FOR SELECT USING (status = 'active');
CREATE POLICY "vendors manage own promotions" ON public.promoted_listings
  FOR ALL TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE POLICY "admins manage all promotions" ON public.promoted_listings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_promoted_updated
  BEFORE UPDATE ON public.promoted_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pick a promoted product for a slot (weighted by bid, with budget eligibility)
CREATE OR REPLACE FUNCTION public.pick_promoted_product(_slot text)
RETURNS TABLE(promotion_id uuid, product_id uuid, vendor_id uuid)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  picked record;
BEGIN
  -- Reset daily counters for stale rows
  UPDATE public.promoted_listings
     SET spent_today = 0, last_reset_date = current_date
   WHERE last_reset_date < current_date;

  SELECT id, p.product_id, p.vendor_id
    INTO picked
    FROM public.promoted_listings p
   WHERE p.slot = _slot
     AND p.status = 'active'
     AND p.spent_today + p.bid_cpc <= p.daily_budget
     AND (p.total_budget IS NULL OR p.spent_total + p.bid_cpc <= p.total_budget)
     AND (p.ends_at IS NULL OR p.ends_at > now())
     AND p.starts_at <= now()
   ORDER BY p.bid_cpc * random() DESC
   LIMIT 1;

  IF picked.id IS NULL THEN RETURN; END IF;

  UPDATE public.promoted_listings
     SET impressions = impressions + 1
   WHERE id = picked.id;

  promotion_id := picked.id;
  product_id := picked.product_id;
  vendor_id := picked.vendor_id;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.pick_promoted_product(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pick_promoted_product(text) TO authenticated, anon, service_role;

-- Charge a click atomically
CREATE OR REPLACE FUNCTION public.charge_promoted_click(_promotion_id uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row record;
BEGIN
  SELECT * INTO row FROM public.promoted_listings
   WHERE id = _promotion_id FOR UPDATE;
  IF row.id IS NULL OR row.status <> 'active' THEN RETURN false; END IF;

  IF row.last_reset_date < current_date THEN
    UPDATE public.promoted_listings SET spent_today = 0, last_reset_date = current_date WHERE id = _promotion_id;
    row.spent_today := 0;
  END IF;

  IF row.spent_today + row.bid_cpc > row.daily_budget
     OR (row.total_budget IS NOT NULL AND row.spent_total + row.bid_cpc > row.total_budget) THEN
    UPDATE public.promoted_listings SET status = 'depleted' WHERE id = _promotion_id;
    RETURN false;
  END IF;

  UPDATE public.promoted_listings
     SET clicks = clicks + 1,
         spent_today = spent_today + bid_cpc,
         spent_total = spent_total + bid_cpc
   WHERE id = _promotion_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.charge_promoted_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.charge_promoted_click(uuid) TO authenticated, anon, service_role;

-- VGS2: Vendor Coupons (self-serve)
CREATE TABLE IF NOT EXISTS public.vendor_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric DEFAULT 0,
  max_discount_amount numeric,
  usage_limit int,
  per_customer_limit int DEFAULT 1,
  total_budget numeric,
  spent_amount numeric NOT NULL DEFAULT 0,
  usage_count int NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','expired','depleted')),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','specific_products')),
  product_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_coupons_vendor ON public.vendor_coupons (vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_coupons_code ON public.vendor_coupons (code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_coupons TO authenticated;
GRANT SELECT ON public.vendor_coupons TO anon;
GRANT ALL ON public.vendor_coupons TO service_role;
ALTER TABLE public.vendor_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active coupons readable" ON public.vendor_coupons
  FOR SELECT USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "vendors manage own coupons" ON public.vendor_coupons
  FOR ALL TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE POLICY "admins manage all coupons" ON public.vendor_coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_vendor_coupons_updated
  BEFORE UPDATE ON public.vendor_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic validate + reserve coupon application
CREATE OR REPLACE FUNCTION public.try_apply_vendor_coupon(_code text, _order_total numeric, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  discount numeric;
  user_uses int;
BEGIN
  SELECT * INTO c FROM public.vendor_coupons WHERE code = _code FOR UPDATE;
  IF c.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF c.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'inactive'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    UPDATE public.vendor_coupons SET status='expired' WHERE id=c.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF c.starts_at > now() THEN RETURN jsonb_build_object('ok', false, 'error', 'not_started'); END IF;
  IF _order_total < COALESCE(c.min_order_amount, 0) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'min_not_met', 'required', c.min_order_amount);
  END IF;
  IF c.usage_limit IS NOT NULL AND c.usage_count >= c.usage_limit THEN
    UPDATE public.vendor_coupons SET status='depleted' WHERE id=c.id;
    RETURN jsonb_build_object('ok', false, 'error', 'usage_limit');
  END IF;

  IF _user_id IS NOT NULL AND c.per_customer_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO user_uses FROM public.promotion_usages
     WHERE user_id = _user_id AND promotion_id::text = c.id::text;
    IF user_uses >= c.per_customer_limit THEN
      RETURN jsonb_build_object('ok', false, 'error', 'per_customer_limit');
    END IF;
  END IF;

  IF c.discount_type = 'percentage' THEN
    discount := _order_total * c.discount_value / 100.0;
  ELSE
    discount := c.discount_value;
  END IF;
  IF c.max_discount_amount IS NOT NULL THEN
    discount := LEAST(discount, c.max_discount_amount);
  END IF;
  discount := LEAST(discount, _order_total);

  IF c.total_budget IS NOT NULL AND c.spent_amount + discount > c.total_budget THEN
    UPDATE public.vendor_coupons SET status='depleted' WHERE id=c.id;
    RETURN jsonb_build_object('ok', false, 'error', 'budget_exhausted');
  END IF;

  UPDATE public.vendor_coupons
     SET usage_count = usage_count + 1,
         spent_amount = spent_amount + discount
   WHERE id = c.id;

  RETURN jsonb_build_object(
    'ok', true,
    'coupon_id', c.id,
    'vendor_id', c.vendor_id,
    'discount', discount,
    'discount_type', c.discount_type
  );
END;
$$;
REVOKE ALL ON FUNCTION public.try_apply_vendor_coupon(text, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_apply_vendor_coupon(text, numeric, uuid) TO authenticated, service_role;
