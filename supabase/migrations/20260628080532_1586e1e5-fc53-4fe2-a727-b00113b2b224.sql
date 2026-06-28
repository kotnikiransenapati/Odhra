
-- 1. Unique coupon codes table
CREATE TABLE IF NOT EXISTS public.unique_coupon_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  campaign_link_id UUID REFERENCES public.campaign_links(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','revoked')),
  redeemed_at TIMESTAMPTZ,
  redeemed_order_id UUID,
  discount_applied NUMERIC(12,2),
  issued_by UUID,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unique_coupon_codes_user_idx ON public.unique_coupon_codes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS unique_coupon_codes_promotion_idx ON public.unique_coupon_codes(promotion_id);
CREATE INDEX IF NOT EXISTS unique_coupon_codes_status_idx ON public.unique_coupon_codes(status);

GRANT SELECT ON public.unique_coupon_codes TO authenticated;
GRANT ALL ON public.unique_coupon_codes TO service_role;

ALTER TABLE public.unique_coupon_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own unique codes"
  ON public.unique_coupon_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage unique codes"
  ON public.unique_coupon_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_unique_coupon_codes_updated_at
  BEFORE UPDATE ON public.unique_coupon_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Attribution column on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS campaign_link_id UUID REFERENCES public.campaign_links(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS unique_coupon_id UUID REFERENCES public.unique_coupon_codes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_campaign_link_idx ON public.orders(campaign_link_id) WHERE campaign_link_id IS NOT NULL;

-- 3. Generator for unique codes (collision-safe)
CREATE OR REPLACE FUNCTION public.generate_unique_coupon_code(p_prefix TEXT DEFAULT 'UQ')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_attempt INT := 0;
BEGIN
  LOOP
    v_code := p_prefix || '-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.unique_coupon_codes WHERE code = v_code);
    v_attempt := v_attempt + 1;
    IF v_attempt > 8 THEN RAISE EXCEPTION 'Unable to generate unique code'; END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

-- 4. Bulk issue (admin only)
CREATE OR REPLACE FUNCTION public.issue_unique_coupon_codes(
  p_promotion_id UUID,
  p_user_ids UUID[],
  p_campaign_link_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_prefix TEXT DEFAULT 'UQ'
) RETURNS SETOF public.unique_coupon_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_row public.unique_coupon_codes;
  v_email TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can issue unique coupon codes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE id = p_promotion_id AND is_active) THEN
    RAISE EXCEPTION 'Promotion not found or inactive';
  END IF;

  FOREACH v_uid IN ARRAY p_user_ids LOOP
    -- Skip if user already has an active code for this promotion
    IF EXISTS (
      SELECT 1 FROM public.unique_coupon_codes
      WHERE promotion_id = p_promotion_id AND user_id = v_uid AND status = 'active'
    ) THEN CONTINUE; END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

    INSERT INTO public.unique_coupon_codes (
      code, promotion_id, user_id, email, campaign_link_id, expires_at, issued_by
    ) VALUES (
      public.generate_unique_coupon_code(p_prefix),
      p_promotion_id, v_uid, v_email, p_campaign_link_id, p_expires_at, auth.uid()
    ) RETURNING * INTO v_row;

    RETURN NEXT v_row;
  END LOOP;
END;
$$;

-- 5. Validate a user-supplied code
CREATE OR REPLACE FUNCTION public.validate_unique_coupon_code(p_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.unique_coupon_codes;
  v_promo public.promotions;
BEGIN
  SELECT * INTO v_row FROM public.unique_coupon_codes WHERE code = upper(p_code);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code not found');
  END IF;
  IF v_row.user_id IS NOT NULL AND v_row.user_id <> p_user_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This code is reserved for another customer');
  END IF;
  IF v_row.status <> 'active' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code has already been used or revoked');
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code has expired');
  END IF;

  SELECT * INTO v_promo FROM public.promotions WHERE id = v_row.promotion_id;
  IF NOT FOUND OR NOT v_promo.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promotion no longer available');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'unique_code_id', v_row.id,
    'promotion_id', v_promo.id,
    'name', v_promo.name,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'max_discount_amount', v_promo.max_discount_amount,
    'min_order_amount', v_promo.min_order_amount,
    'type', v_promo.type
  );
END;
$$;

-- 6. Redeem
CREATE OR REPLACE FUNCTION public.redeem_unique_coupon_code(
  p_code TEXT, p_user_id UUID, p_order_id UUID, p_discount NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.unique_coupon_codes;
BEGIN
  SELECT * INTO v_row FROM public.unique_coupon_codes
   WHERE code = upper(p_code) FOR UPDATE;
  IF NOT FOUND OR v_row.status <> 'active' THEN RETURN FALSE; END IF;
  IF v_row.user_id IS NOT NULL AND v_row.user_id <> p_user_id THEN RETURN FALSE; END IF;

  UPDATE public.unique_coupon_codes
     SET status='redeemed', redeemed_at=now(),
         redeemed_order_id=p_order_id, discount_applied=p_discount
   WHERE id = v_row.id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_unique_coupon_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_unique_coupon_code(TEXT, UUID, UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_unique_coupon_codes(UUID, UUID[], UUID, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_coupon_code(TEXT) TO authenticated, service_role;
