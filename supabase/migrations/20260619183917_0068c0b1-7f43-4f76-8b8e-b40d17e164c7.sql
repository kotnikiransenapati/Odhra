
-- ============== BATCH H5: CUSTOMER LOYALTY TIERS ==============
CREATE TABLE IF NOT EXISTS public.customer_loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  rank integer NOT NULL DEFAULT 0,
  point_multiplier numeric(4,2) NOT NULL DEFAULT 1.00 CHECK (point_multiplier >= 0),
  min_lifetime_spend numeric(14,2) NOT NULL DEFAULT 0,
  min_orders_12mo integer NOT NULL DEFAULT 0,
  free_shipping_threshold numeric(12,2),
  birthday_bonus_points integer NOT NULL DEFAULT 0,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge_color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_loyalty_tiers TO authenticated;
GRANT SELECT ON public.customer_loyalty_tiers TO anon;
GRANT ALL ON public.customer_loyalty_tiers TO service_role;
ALTER TABLE public.customer_loyalty_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cltiers_read_all" ON public.customer_loyalty_tiers FOR SELECT USING (true);
CREATE POLICY "cltiers_admin_write" ON public.customer_loyalty_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.customer_tier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier_id uuid NOT NULL REFERENCES public.customer_loyalty_tiers(id) ON DELETE RESTRICT,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  assigned_by uuid,
  reason text,
  lifetime_spend_at_assign numeric(14,2),
  orders_12mo_at_assign integer,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_tier_assignments TO authenticated;
GRANT ALL ON public.customer_tier_assignments TO service_role;
ALTER TABLE public.customer_tier_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cta_select_own_or_admin" ON public.customer_tier_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cta_admin_write" ON public.customer_tier_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_cta_user_current
  ON public.customer_tier_assignments(user_id) WHERE is_current = true;

CREATE TRIGGER trg_cltiers_updated_at BEFORE UPDATE ON public.customer_loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.customer_loyalty_tiers (name, rank, point_multiplier, min_lifetime_spend, min_orders_12mo, birthday_bonus_points, badge_color, perks)
VALUES
  ('Bronze',   1, 1.00, 0,       0,  50,  '#cd7f32', '["Standard rewards"]'::jsonb),
  ('Silver',   2, 1.25, 10000,   3,  100, '#c0c0c0', '["1.25x points","Early sale access"]'::jsonb),
  ('Gold',     3, 1.50, 50000,   8,  250, '#ffd700', '["1.5x points","Free shipping ≥ ₹499","Priority support"]'::jsonb),
  ('Platinum', 4, 2.00, 150000, 15,  500, '#e5e4e2', '["2x points","Always free shipping","Concierge support","Exclusive drops"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.recalc_customer_tier(_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _spend numeric(14,2); _orders int; _tier_id uuid;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT COALESCE(SUM(total_amount),0)::numeric(14,2),
         COUNT(*) FILTER (WHERE created_at >= now() - interval '12 months')
    INTO _spend, _orders
    FROM public.orders
    WHERE user_id=_user_id AND status NOT IN ('cancelled','refunded');

  SELECT id INTO _tier_id FROM public.customer_loyalty_tiers
    WHERE is_active=true AND _spend >= min_lifetime_spend AND _orders >= min_orders_12mo
    ORDER BY rank DESC LIMIT 1;
  IF _tier_id IS NULL THEN
    SELECT id INTO _tier_id FROM public.customer_loyalty_tiers WHERE is_active=true ORDER BY rank ASC LIMIT 1;
  END IF;

  UPDATE public.customer_tier_assignments SET is_current=false, effective_until=now()
    WHERE user_id=_user_id AND is_current=true;
  INSERT INTO public.customer_tier_assignments(user_id,tier_id,assigned_by,reason,lifetime_spend_at_assign,orders_12mo_at_assign)
    VALUES(_user_id,_tier_id,auth.uid(),'auto-recalc',_spend,_orders);
  RETURN _tier_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_loyalty_tier()
RETURNS TABLE(tier_id uuid, name text, point_multiplier numeric, perks jsonb, badge_color text,
              free_shipping_threshold numeric, birthday_bonus_points int, assigned_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.point_multiplier, t.perks, t.badge_color,
         t.free_shipping_threshold, t.birthday_bonus_points, a.effective_from
  FROM public.customer_tier_assignments a
  JOIN public.customer_loyalty_tiers t ON t.id=a.tier_id
  WHERE a.user_id=auth.uid() AND a.is_current=true LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_customer_tiers_list()
RETURNS SETOF public.customer_loyalty_tiers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.customer_loyalty_tiers ORDER BY rank ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_customer_tier_upsert(
  _id uuid, _name text, _rank int, _point_multiplier numeric,
  _min_lifetime_spend numeric, _min_orders_12mo int,
  _free_shipping_threshold numeric, _birthday_bonus_points int,
  _badge_color text, _perks jsonb, _is_active boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _out uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.customer_loyalty_tiers(name,rank,point_multiplier,min_lifetime_spend,min_orders_12mo,free_shipping_threshold,birthday_bonus_points,badge_color,perks,is_active)
    VALUES(_name,_rank,_point_multiplier,_min_lifetime_spend,_min_orders_12mo,_free_shipping_threshold,_birthday_bonus_points,_badge_color,COALESCE(_perks,'[]'::jsonb),COALESCE(_is_active,true))
    RETURNING id INTO _out;
  ELSE
    UPDATE public.customer_loyalty_tiers SET name=_name,rank=_rank,point_multiplier=_point_multiplier,
      min_lifetime_spend=_min_lifetime_spend,min_orders_12mo=_min_orders_12mo,
      free_shipping_threshold=_free_shipping_threshold,birthday_bonus_points=_birthday_bonus_points,
      badge_color=_badge_color,perks=COALESCE(_perks,perks),is_active=COALESCE(_is_active,is_active)
    WHERE id=_id RETURNING id INTO _out;
  END IF;
  RETURN _out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_customer_tier(_user_id uuid, _tier_id uuid, _reason text DEFAULT 'manual')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.customer_tier_assignments SET is_current=false, effective_until=now()
    WHERE user_id=_user_id AND is_current=true;
  INSERT INTO public.customer_tier_assignments(user_id,tier_id,assigned_by,reason)
    VALUES(_user_id,_tier_id,auth.uid(),_reason) RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- ============== BATCH H6: STOCK RESERVATIONS ==============
CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','confirmed','expired')),
  reason text,
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  released_at timestamptz,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_reservations TO authenticated;
GRANT ALL ON public.stock_reservations TO service_role;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sres_select_own_or_admin" ON public.stock_reservations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "sres_admin_write" ON public.stock_reservations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_sres_user ON public.stock_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_sres_product_status ON public.stock_reservations(product_id, status);
CREATE INDEX IF NOT EXISTS idx_sres_expires ON public.stock_reservations(expires_at) WHERE status='held';
CREATE UNIQUE INDEX IF NOT EXISTS uq_sres_idem ON public.stock_reservations(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER trg_sres_updated_at BEFORE UPDATE ON public.stock_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.stock_reserve(
  _product_id uuid, _quantity int, _variant_id uuid DEFAULT NULL,
  _ttl_minutes int DEFAULT 15, _idempotency_key text DEFAULT NULL,
  _reason text DEFAULT 'checkout'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _avail int;
  _existing_holds int;
  _id uuid;
  _existing uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'invalid quantity'; END IF;
  IF _ttl_minutes IS NULL OR _ttl_minutes <= 0 OR _ttl_minutes > 120 THEN
    _ttl_minutes := 15;
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _existing FROM public.stock_reservations
      WHERE idempotency_key=_idempotency_key AND user_id=_uid;
    IF _existing IS NOT NULL THEN RETURN _existing; END IF;
  END IF;

  SELECT stock_quantity INTO _avail FROM public.products WHERE id=_product_id FOR UPDATE;
  IF _avail IS NULL THEN RAISE EXCEPTION 'product not found'; END IF;

  SELECT COALESCE(SUM(quantity),0) INTO _existing_holds
    FROM public.stock_reservations
    WHERE product_id=_product_id
      AND (variant_id IS NOT DISTINCT FROM _variant_id)
      AND status='held' AND expires_at > now();

  IF _avail - _existing_holds < _quantity THEN
    RAISE EXCEPTION 'insufficient stock (available: %)', GREATEST(_avail - _existing_holds, 0);
  END IF;

  INSERT INTO public.stock_reservations(user_id, product_id, variant_id, quantity,
    expires_at, idempotency_key, reason)
  VALUES(_uid, _product_id, _variant_id, _quantity,
    now() + (_ttl_minutes || ' minutes')::interval, _idempotency_key, _reason)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.stock_release(_reservation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row record;
BEGIN
  SELECT * INTO _row FROM public.stock_reservations WHERE id=_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF _row.user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _row.status <> 'held' THEN RETURN false; END IF;
  UPDATE public.stock_reservations SET status='released', released_at=now()
    WHERE id=_reservation_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.stock_confirm(_reservation_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    -- allow service role / admin only
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO _row FROM public.stock_reservations WHERE id=_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF _row.status <> 'held' THEN RAISE EXCEPTION 'cannot confirm in status %', _row.status; END IF;

  UPDATE public.products SET stock_quantity = GREATEST(stock_quantity - _row.quantity, 0)
    WHERE id=_row.product_id;
  UPDATE public.stock_reservations
    SET status='confirmed', confirmed_at=now(), order_id=_order_id
    WHERE id=_reservation_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_stock_reservations()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int;
BEGIN
  WITH upd AS (
    UPDATE public.stock_reservations
       SET status='expired', released_at=now()
     WHERE status='held' AND expires_at <= now()
     RETURNING 1
  )
  SELECT count(*) INTO _n FROM upd;
  RETURN COALESCE(_n,0);
END;
$$;

CREATE OR REPLACE FUNCTION public.my_stock_reservations()
RETURNS SETOF public.stock_reservations LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT * FROM public.stock_reservations
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC LIMIT 100;
$$;
