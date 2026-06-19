
-- BATCH H3: PRE-ORDERS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_preorder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_release_date timestamptz,
  ADD COLUMN IF NOT EXISTS preorder_deposit_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (preorder_deposit_percent >= 0 AND preorder_deposit_percent <= 100),
  ADD COLUMN IF NOT EXISTS preorder_max_quantity integer;

CREATE TABLE IF NOT EXISTS public.preorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
  balance_amount numeric(12,2) NOT NULL DEFAULT 0,
  expected_release_date timestamptz,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','confirmed','fulfilled','cancelled','expired')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','deposit_paid','fully_paid','refunded')),
  shipping_address jsonb,
  contact_email text,
  contact_phone text,
  notes text,
  fulfilled_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancellation_reason text,
  fulfilled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preorders TO authenticated;
GRANT ALL ON public.preorders TO service_role;
ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preorders_select" ON public.preorders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
         OR vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE POLICY "preorders_insert" ON public.preorders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "preorders_update" ON public.preorders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid()) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_preorders_user ON public.preorders(user_id);
CREATE INDEX IF NOT EXISTS idx_preorders_product ON public.preorders(product_id);
CREATE INDEX IF NOT EXISTS idx_preorders_status ON public.preorders(status);

CREATE TRIGGER trg_preorders_updated_at BEFORE UPDATE ON public.preorders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.preorder_create(
  _product_id uuid, _quantity integer, _variant_id uuid DEFAULT NULL,
  _shipping_address jsonb DEFAULT NULL, _contact_email text DEFAULT NULL,
  _contact_phone text DEFAULT NULL, _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _p record; _used int; _price numeric(12,2); _dep numeric(12,2); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'invalid quantity'; END IF;
  SELECT id, vendor_id, price, sale_price, is_preorder_enabled, preorder_release_date,
         preorder_deposit_percent, preorder_max_quantity INTO _p
    FROM public.products WHERE id = _product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  IF NOT _p.is_preorder_enabled THEN RAISE EXCEPTION 'preorders disabled'; END IF;
  IF _p.preorder_max_quantity IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity),0) INTO _used FROM public.preorders
      WHERE product_id=_product_id AND status IN ('reserved','confirmed');
    IF _used + _quantity > _p.preorder_max_quantity THEN
      RAISE EXCEPTION 'preorder capacity exceeded';
    END IF;
  END IF;
  _price := COALESCE(_p.sale_price, _p.price);
  _dep := round(_price * _quantity * (_p.preorder_deposit_percent / 100.0), 2);
  INSERT INTO public.preorders(user_id, product_id, variant_id, vendor_id, quantity, unit_price,
    deposit_amount, balance_amount, expected_release_date, shipping_address, contact_email, contact_phone, notes)
  VALUES (_uid, _product_id, _variant_id, _p.vendor_id, _quantity, _price,
    _dep, (_price*_quantity)-_dep, _p.preorder_release_date, _shipping_address, _contact_email, _contact_phone, _notes)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.preorder_cancel(_preorder_id uuid, _reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO _row FROM public.preorders WHERE id=_preorder_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF _row.user_id <> _uid AND NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _row.status IN ('fulfilled','cancelled') THEN RAISE EXCEPTION 'cannot cancel in status %', _row.status; END IF;
  UPDATE public.preorders SET status='cancelled', cancelled_at=now(), cancellation_reason=_reason WHERE id=_preorder_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_preorders()
RETURNS SETOF public.preorders LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT * FROM public.preorders WHERE user_id = auth.uid() ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_preorders_list(_status text DEFAULT NULL, _limit int DEFAULT 100)
RETURNS SETOF public.preorders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.preorders
    WHERE (_status IS NULL OR status=_status) ORDER BY created_at DESC LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_preorder_fulfill(_preorder_id uuid, _order_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.preorders SET status='fulfilled', fulfilled_at=now(), fulfilled_order_id=_order_id WHERE id=_preorder_id;
  RETURN true;
END;
$$;

-- BATCH H4: COMMISSION TIERS
CREATE TABLE IF NOT EXISTS public.vendor_commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  rank integer NOT NULL DEFAULT 0,
  commission_percent numeric(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  min_monthly_revenue numeric(14,2) NOT NULL DEFAULT 0,
  min_rating numeric(3,2) NOT NULL DEFAULT 0,
  min_on_time_percent numeric(5,2) NOT NULL DEFAULT 0,
  max_cancellation_percent numeric(5,2) NOT NULL DEFAULT 100,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge_color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_commission_tiers TO authenticated;
GRANT ALL ON public.vendor_commission_tiers TO service_role;
ALTER TABLE public.vendor_commission_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers_select" ON public.vendor_commission_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "tiers_admin" ON public.vendor_commission_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.vendor_commission_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.vendor_commission_tiers(id) ON DELETE RESTRICT,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  assigned_by uuid,
  assignment_reason text,
  monthly_revenue_at_assignment numeric(14,2),
  rating_at_assignment numeric(3,2),
  on_time_percent_at_assignment numeric(5,2),
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_commission_assignments TO authenticated;
GRANT ALL ON public.vendor_commission_assignments TO service_role;
ALTER TABLE public.vendor_commission_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assign_select" ON public.vendor_commission_assignments FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id=auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "assign_admin" ON public.vendor_commission_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_assign_vendor_current
  ON public.vendor_commission_assignments(vendor_id) WHERE is_current = true;

CREATE TRIGGER trg_tiers_updated_at BEFORE UPDATE ON public.vendor_commission_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.vendor_commission_tiers (name, rank, commission_percent, min_monthly_revenue, min_rating, min_on_time_percent, max_cancellation_percent, badge_color, perks)
VALUES
  ('Bronze',   1, 15.00, 0,       0,    0,    100, '#cd7f32', '["Standard support"]'::jsonb),
  ('Silver',   2, 12.00, 50000,   4.0,  85,   10,  '#c0c0c0', '["Priority support","Featured listings"]'::jsonb),
  ('Gold',     3, 10.00, 200000,  4.3,  92,   5,   '#ffd700', '["Priority support","Featured listings","Reduced payout hold"]'::jsonb),
  ('Platinum', 4,  8.00, 500000,  4.5,  96,   3,   '#e5e4e2', '["Dedicated manager","Featured listings","Same-day payouts","Marketing co-op"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.recalc_vendor_commission_tier(_vendor_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _revenue numeric(14,2); _rating numeric(3,2); _ontime numeric(5,2); _cancel numeric(5,2); _tier_id uuid;
BEGIN
  SELECT COALESCE(SUM(total_amount),0) INTO _revenue FROM public.orders
    WHERE vendor_id=_vendor_id AND created_at >= now() - interval '30 days'
      AND status NOT IN ('cancelled','refunded');
  SELECT COALESCE(AVG(rating),0)::numeric(3,2) INTO _rating
    FROM public.reviews r JOIN public.products p ON p.id=r.product_id
    WHERE p.vendor_id=_vendor_id AND r.status='approved';
  SELECT COALESCE(AVG(on_time_delivery_rate),0)::numeric(5,2),
         COALESCE(AVG(cancellation_rate),0)::numeric(5,2) INTO _ontime,_cancel
    FROM public.vendor_performance_metrics WHERE vendor_id=_vendor_id
    ORDER BY computed_at DESC LIMIT 30;
  SELECT id INTO _tier_id FROM public.vendor_commission_tiers
    WHERE is_active=true AND _revenue>=min_monthly_revenue AND _rating>=min_rating
      AND _ontime>=min_on_time_percent AND _cancel<=max_cancellation_percent
    ORDER BY rank DESC LIMIT 1;
  IF _tier_id IS NULL THEN
    SELECT id INTO _tier_id FROM public.vendor_commission_tiers WHERE is_active=true ORDER BY rank ASC LIMIT 1;
  END IF;
  UPDATE public.vendor_commission_assignments SET is_current=false, effective_until=now()
    WHERE vendor_id=_vendor_id AND is_current=true;
  INSERT INTO public.vendor_commission_assignments(vendor_id,tier_id,assigned_by,assignment_reason,
    monthly_revenue_at_assignment,rating_at_assignment,on_time_percent_at_assignment)
  VALUES(_vendor_id,_tier_id,auth.uid(),'auto-recalc',_revenue,_rating,_ontime);
  RETURN _tier_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_commission_tiers_list()
RETURNS SETOF public.vendor_commission_tiers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.vendor_commission_tiers ORDER BY rank ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_commission_tier_upsert(
  _id uuid, _name text, _rank int, _commission_percent numeric,
  _min_monthly_revenue numeric, _min_rating numeric,
  _min_on_time_percent numeric, _max_cancellation_percent numeric,
  _badge_color text, _perks jsonb, _is_active boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _out uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.vendor_commission_tiers(name,rank,commission_percent,min_monthly_revenue,min_rating,min_on_time_percent,max_cancellation_percent,badge_color,perks,is_active)
    VALUES(_name,_rank,_commission_percent,_min_monthly_revenue,_min_rating,_min_on_time_percent,_max_cancellation_percent,_badge_color,COALESCE(_perks,'[]'::jsonb),COALESCE(_is_active,true))
    RETURNING id INTO _out;
  ELSE
    UPDATE public.vendor_commission_tiers SET name=_name,rank=_rank,commission_percent=_commission_percent,
      min_monthly_revenue=_min_monthly_revenue,min_rating=_min_rating,min_on_time_percent=_min_on_time_percent,
      max_cancellation_percent=_max_cancellation_percent,badge_color=_badge_color,
      perks=COALESCE(_perks,perks),is_active=COALESCE(_is_active,is_active)
    WHERE id=_id RETURNING id INTO _out;
  END IF;
  RETURN _out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_vendor_tier_assign(_vendor_id uuid, _tier_id uuid, _reason text DEFAULT 'manual')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.vendor_commission_assignments SET is_current=false, effective_until=now()
    WHERE vendor_id=_vendor_id AND is_current=true;
  INSERT INTO public.vendor_commission_assignments(vendor_id,tier_id,assigned_by,assignment_reason)
    VALUES(_vendor_id,_tier_id,auth.uid(),_reason) RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.vendor_my_commission_tier()
RETURNS TABLE(tier_id uuid, name text, commission_percent numeric, perks jsonb, badge_color text, assigned_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.commission_percent, t.perks, t.badge_color, a.effective_from
  FROM public.vendor_commission_assignments a
  JOIN public.vendor_commission_tiers t ON t.id=a.tier_id
  JOIN public.vendors v ON v.id=a.vendor_id
  WHERE v.user_id=auth.uid() AND a.is_current=true LIMIT 1;
END;
$$;
