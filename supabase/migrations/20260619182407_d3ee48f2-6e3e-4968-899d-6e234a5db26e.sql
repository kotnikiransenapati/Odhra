-- ============================================================
-- BATCH 1: GIFT CARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  initial_amount numeric(12,2) NOT NULL CHECK (initial_amount > 0),
  balance numeric(12,2) NOT NULL CHECK (balance >= 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','cancelled')),
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_to_email text,
  recipient_name text,
  sender_name text,
  message text,
  expires_at timestamptz,
  issued_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_cards_status_idx ON public.gift_cards(status);
CREATE INDEX IF NOT EXISTS gift_cards_issued_to_user_idx ON public.gift_cards(issued_to_user_id);
CREATE INDEX IF NOT EXISTS gift_cards_expires_at_idx ON public.gift_cards(expires_at) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE ON public.gift_cards TO authenticated;
GRANT ALL ON public.gift_cards TO service_role;

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gift cards"
  ON public.gift_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their own gift cards"
  ON public.gift_cards FOR SELECT TO authenticated
  USING (issued_to_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.gift_card_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  balance_after numeric(12,2) NOT NULL CHECK (balance_after >= 0),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS gift_card_redemptions_card_idx ON public.gift_card_redemptions(gift_card_id);
CREATE INDEX IF NOT EXISTS gift_card_redemptions_user_idx ON public.gift_card_redemptions(user_id);

GRANT SELECT, INSERT ON public.gift_card_redemptions TO authenticated;
GRANT ALL ON public.gift_card_redemptions TO service_role;

ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all redemptions"
  ON public.gift_card_redemptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own redemptions"
  ON public.gift_card_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public._gift_card_generate_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := 'GC-';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    code := code || substr(chars, 1 + floor(random()*length(chars))::int, 1);
  END LOOP;
  code := code || '-';
  FOR i IN 1..4 LOOP
    code := code || substr(chars, 1 + floor(random()*length(chars))::int, 1);
  END LOOP;
  code := code || '-';
  FOR i IN 1..4 LOOP
    code := code || substr(chars, 1 + floor(random()*length(chars))::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_giftcard_issue(
  p_amount numeric,
  p_recipient_email text DEFAULT NULL,
  p_recipient_user_id uuid DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_sender_name text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_expires_days int DEFAULT 365
)
RETURNS public.gift_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempt int := 0;
  v_row public.gift_cards;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  LOOP
    v_code := public._gift_card_generate_code();
    BEGIN
      INSERT INTO public.gift_cards(
        code, initial_amount, balance, issued_by,
        issued_to_user_id, issued_to_email, recipient_name, sender_name, message,
        expires_at
      ) VALUES (
        v_code, p_amount, p_amount, auth.uid(),
        p_recipient_user_id, p_recipient_email, p_recipient_name, p_sender_name, p_message,
        CASE WHEN p_expires_days IS NULL THEN NULL ELSE now() + (p_expires_days || ' days')::interval END
      )
      RETURNING * INTO v_row;
      RETURN v_row;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt > 5 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_giftcards_list(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, code text, initial_amount numeric, balance numeric, currency text,
  status text, recipient_name text, issued_to_email text, sender_name text,
  expires_at timestamptz, issued_at timestamptz, redeemed_at timestamptz,
  total_redemptions bigint, total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH filtered AS (
    SELECT gc.*,
      (SELECT count(*) FROM public.gift_card_redemptions r WHERE r.gift_card_id = gc.id) AS total_redemptions
    FROM public.gift_cards gc
    WHERE (p_status IS NULL OR gc.status = p_status)
      AND (p_search IS NULL OR gc.code ILIKE '%'||p_search||'%' OR gc.issued_to_email ILIKE '%'||p_search||'%' OR gc.recipient_name ILIKE '%'||p_search||'%')
  ), counted AS (
    SELECT count(*)::bigint AS cnt FROM filtered
  )
  SELECT f.id, f.code, f.initial_amount, f.balance, f.currency,
         f.status, f.recipient_name, f.issued_to_email, f.sender_name,
         f.expires_at, f.issued_at, f.redeemed_at,
         f.total_redemptions::bigint, c.cnt
  FROM filtered f CROSS JOIN counted c
  ORDER BY f.issued_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_giftcard_cancel(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.gift_cards
     SET status = 'cancelled', updated_at = now()
   WHERE id = p_id AND status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.giftcard_check(p_code text)
RETURNS TABLE (valid boolean, balance numeric, currency text, expires_at timestamptz, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.gift_cards;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO v FROM public.gift_cards WHERE upper(code) = upper(p_code) LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::numeric, 'INR'::text, NULL::timestamptz, 'Code not found'::text;
    RETURN;
  END IF;
  IF v.status <> 'active' THEN
    RETURN QUERY SELECT false, v.balance, v.currency, v.expires_at, ('Card '||v.status)::text;
    RETURN;
  END IF;
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    UPDATE public.gift_cards SET status='expired', updated_at=now() WHERE id=v.id;
    RETURN QUERY SELECT false, v.balance, v.currency, v.expires_at, 'Card expired'::text;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, v.balance, v.currency, v.expires_at, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.giftcard_redeem(
  p_code text,
  p_amount numeric,
  p_order_id uuid DEFAULT NULL
)
RETURNS TABLE (redemption_id uuid, amount_applied numeric, balance_after numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.gift_cards;
  v_applied numeric;
  v_new_balance numeric;
  v_red_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;

  SELECT * INTO v FROM public.gift_cards WHERE upper(code) = upper(p_code) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'gift card not found'; END IF;
  IF v.status <> 'active' THEN RAISE EXCEPTION 'gift card not active (%)', v.status; END IF;
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    UPDATE public.gift_cards SET status='expired', updated_at=now() WHERE id=v.id;
    RAISE EXCEPTION 'gift card expired';
  END IF;
  IF v.balance <= 0 THEN
    UPDATE public.gift_cards SET status='redeemed', updated_at=now() WHERE id=v.id;
    RAISE EXCEPTION 'no balance';
  END IF;

  v_applied := LEAST(p_amount, v.balance);
  v_new_balance := v.balance - v_applied;

  UPDATE public.gift_cards
     SET balance = v_new_balance,
         status = CASE WHEN v_new_balance <= 0 THEN 'redeemed' ELSE 'active' END,
         redeemed_at = CASE WHEN v_new_balance <= 0 THEN now() ELSE redeemed_at END,
         issued_to_user_id = COALESCE(issued_to_user_id, auth.uid()),
         updated_at = now()
   WHERE id = v.id;

  INSERT INTO public.gift_card_redemptions(gift_card_id, user_id, order_id, amount, balance_after)
  VALUES (v.id, auth.uid(), p_order_id, v_applied, v_new_balance)
  RETURNING id INTO v_red_id;

  RETURN QUERY SELECT v_red_id, v_applied, v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_gift_cards()
RETURNS TABLE (
  id uuid, code text, balance numeric, currency text, status text,
  sender_name text, message text, expires_at timestamptz, issued_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  RETURN QUERY
  SELECT gc.id, gc.code, gc.balance, gc.currency, gc.status,
         gc.sender_name, gc.message, gc.expires_at, gc.issued_at
  FROM public.gift_cards gc
  WHERE gc.issued_to_user_id = auth.uid()
  ORDER BY gc.issued_at DESC;
END;
$$;

-- ============================================================
-- BATCH 2: VENDOR REVIEW REPLY MODERATION
-- ============================================================

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS vendor_reply_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS vendor_reply_moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS vendor_reply_moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_reply_moderation_notes text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_vendor_reply_status_chk'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_vendor_reply_status_chk
      CHECK (vendor_reply_status IN ('none','pending','approved','rejected','flagged'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS reviews_vendor_reply_status_idx
  ON public.reviews(vendor_reply_status)
  WHERE vendor_reply_status IN ('pending','flagged');

CREATE OR REPLACE FUNCTION public.vendor_submit_review_reply(
  p_review_id uuid,
  p_reply text
)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id uuid;
  v_owns boolean;
  v_row public.reviews;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_reply IS NULL OR length(trim(p_reply)) < 3 THEN RAISE EXCEPTION 'reply too short'; END IF;
  IF length(p_reply) > 2000 THEN RAISE EXCEPTION 'reply too long'; END IF;

  SELECT v.id INTO v_vendor_id
  FROM public.reviews r
  JOIN public.products p ON p.id = r.product_id
  JOIN public.vendors v ON v.id = p.vendor_id
  WHERE r.id = p_review_id;

  IF v_vendor_id IS NULL THEN RAISE EXCEPTION 'review not found'; END IF;

  SELECT (user_id = auth.uid()) INTO v_owns
  FROM public.vendors WHERE id = v_vendor_id;

  IF NOT v_owns AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.reviews
     SET vendor_reply = p_reply,
         vendor_replied_at = now(),
         vendor_reply_status = 'pending',
         vendor_reply_moderated_at = NULL,
         vendor_reply_moderated_by = NULL,
         vendor_reply_moderation_notes = NULL,
         updated_at = now()
   WHERE id = p_review_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_reply_moderate(
  p_review_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.reviews;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_decision NOT IN ('approved','rejected','flagged') THEN
    RAISE EXCEPTION 'invalid decision';
  END IF;

  UPDATE public.reviews
     SET vendor_reply_status = p_decision,
         vendor_reply_moderated_at = now(),
         vendor_reply_moderated_by = auth.uid(),
         vendor_reply_moderation_notes = p_notes,
         vendor_reply = CASE WHEN p_decision = 'rejected' THEN NULL ELSE vendor_reply END,
         updated_at = now()
   WHERE id = p_review_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'review not found'; END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_replies_list(
  p_status text DEFAULT 'pending',
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  review_id uuid,
  product_id uuid,
  product_title text,
  rating int,
  review_content text,
  vendor_reply text,
  vendor_replied_at timestamptz,
  vendor_reply_status text,
  vendor_brand text,
  vendor_id uuid,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH filtered AS (
    SELECT r.id AS review_id, p.id AS product_id, p.title AS product_title,
           r.rating, r.content AS review_content,
           r.vendor_reply, r.vendor_replied_at, r.vendor_reply_status,
           v.brand_name AS vendor_brand, v.id AS vendor_id
    FROM public.reviews r
    JOIN public.products p ON p.id = r.product_id
    JOIN public.vendors v ON v.id = p.vendor_id
    WHERE r.vendor_reply IS NOT NULL
      AND (p_status IS NULL OR p_status = 'all' OR r.vendor_reply_status = p_status)
  ), c AS (SELECT count(*)::bigint AS cnt FROM filtered)
  SELECT f.review_id, f.product_id, f.product_title, f.rating, f.review_content,
         f.vendor_reply, f.vendor_replied_at, f.vendor_reply_status,
         f.vendor_brand, f.vendor_id, c.cnt
  FROM filtered f CROSS JOIN c
  ORDER BY f.vendor_replied_at DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_giftcard_issue(numeric, text, uuid, text, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_giftcards_list(text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_giftcard_cancel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.giftcard_check(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.giftcard_redeem(text, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_gift_cards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_submit_review_reply(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_reply_moderate(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_replies_list(text, int, int) TO authenticated;