
-- ============================================================
-- Unified Unique-Code Engine
-- One table powers per-customer codes for: coupons, referrals,
-- spin-wheel, welcome popup, and custom campaign links.
-- ============================================================

-- 1. Extend the existing unique_coupon_codes table
ALTER TABLE public.unique_coupon_codes
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'coupon',
  ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS uses_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS link_slug text,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS policy_id uuid;

DO $$ BEGIN
  ALTER TABLE public.unique_coupon_codes
    ADD CONSTRAINT unique_coupon_codes_kind_check
    CHECK (kind IN ('coupon','referral','spin','welcome','birthday','custom_link'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_coupon_codes_link_slug
  ON public.unique_coupon_codes(link_slug) WHERE link_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unique_coupon_codes_kind_user
  ON public.unique_coupon_codes(kind, user_id) WHERE status = 'active';

-- 2. Admin-managed policies — the templates the admin tunes
CREATE TABLE IF NOT EXISTS public.unique_code_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  prefix text NOT NULL DEFAULT 'UQ',
  code_length integer NOT NULL DEFAULT 8 CHECK (code_length BETWEEN 4 AND 24),
  validity_hours integer NOT NULL DEFAULT 168,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  discount_type text CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(10,2),
  min_order_amount numeric(10,2),
  max_per_user integer NOT NULL DEFAULT 1,
  generate_unique_link boolean NOT NULL DEFAULT false,
  link_target_path text DEFAULT '/',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_code_policies_kind_check
    CHECK (kind IN ('coupon','referral','spin','welcome','birthday','custom_link'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unique_code_policies TO authenticated;
GRANT ALL ON public.unique_code_policies TO service_role;
ALTER TABLE public.unique_code_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active policies"
  ON public.unique_code_policies FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage policies"
  ON public.unique_code_policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_unique_code_policies_kind_active
  ON public.unique_code_policies(kind) WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.tg_unique_code_policies_updated()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_unique_code_policies_updated ON public.unique_code_policies;
CREATE TRIGGER trg_unique_code_policies_updated
  BEFORE UPDATE ON public.unique_code_policies
  FOR EACH ROW EXECUTE FUNCTION public.tg_unique_code_policies_updated();

-- 3. Seed sensible defaults (only if missing)
INSERT INTO public.unique_code_policies (kind, name, prefix, code_length, validity_hours, max_uses, discount_type, discount_value, generate_unique_link, link_target_path)
SELECT * FROM (VALUES
  ('referral','Default Referral','REF',8,720,10,'percentage',10,true,'/auth?mode=signup'),
  ('spin','Default Spin Reward','SPIN',8,168,1,'percentage',10,false,'/'),
  ('welcome','Welcome Gift','WEL',8,336,1,'percentage',15,false,'/'),
  ('birthday','Birthday Treat','BDAY',8,720,1,'percentage',20,false,'/'),
  ('custom_link','Custom Campaign Link','LINK',10,720,100,NULL,NULL,true,'/')
) AS v(kind,name,prefix,code_length,validity_hours,max_uses,discount_type,discount_value,generate_unique_link,link_target_path)
WHERE NOT EXISTS (
  SELECT 1 FROM public.unique_code_policies p WHERE p.kind = v.kind
);

-- 4. Secure code/slug generator (32-char unambiguous alphabet)
CREATE OR REPLACE FUNCTION public.generate_unique_code_token(p_prefix text, p_length int)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..p_length LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN upper(p_prefix) || '-' || result;
END $$;

-- 5. Issue a unique code for a user from a policy
CREATE OR REPLACE FUNCTION public.issue_unique_code(
  p_kind text,
  p_user_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_overrides jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_policy public.unique_code_policies;
  v_code text;
  v_slug text;
  v_id uuid;
  v_attempt int := 0;
  v_existing_count int;
BEGIN
  -- Active policy lookup
  SELECT * INTO v_policy
  FROM public.unique_code_policies
  WHERE kind = p_kind AND is_active = true
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active policy for kind: %', p_kind USING ERRCODE = 'P0002';
  END IF;

  -- Enforce per-user cap (skip for kinds where user_id is null, e.g. anonymous welcome)
  IF p_user_id IS NOT NULL AND v_policy.max_per_user > 0 THEN
    SELECT count(*) INTO v_existing_count
    FROM public.unique_coupon_codes
    WHERE user_id = p_user_id AND kind = p_kind AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now());
    IF v_existing_count >= v_policy.max_per_user THEN
      RAISE EXCEPTION 'User has reached max active codes for %', p_kind USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Collision-safe code generation
  LOOP
    v_attempt := v_attempt + 1;
    v_code := public.generate_unique_code_token(v_policy.prefix, v_policy.code_length);
    v_slug := CASE WHEN v_policy.generate_unique_link
      THEN lower(replace(v_code, '-', ''))
      ELSE NULL END;
    BEGIN
      INSERT INTO public.unique_coupon_codes (
        code, user_id, email, kind, max_uses, link_slug, policy_id,
        valid_from, expires_at, discount_applied, metadata, issued_by, status
      ) VALUES (
        v_code, p_user_id, p_email, p_kind, v_policy.max_uses, v_slug, v_policy.id,
        now(), now() + (v_policy.validity_hours || ' hours')::interval,
        v_policy.discount_value,
        v_policy.metadata || coalesce(p_overrides, '{}'::jsonb),
        auth.uid(), 'active'
      ) RETURNING id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt > 6 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_id,
    'code', v_code,
    'kind', p_kind,
    'link_slug', v_slug,
    'expires_at', (now() + (v_policy.validity_hours || ' hours')::interval),
    'discount_type', v_policy.discount_type,
    'discount_value', v_policy.discount_value,
    'max_uses', v_policy.max_uses,
    'target_path', v_policy.link_target_path
  );
END $$;

REVOKE ALL ON FUNCTION public.issue_unique_code(text,uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_unique_code(text,uuid,text,jsonb) TO authenticated, service_role;

-- 6. Universal validator (any kind, by code OR by link_slug)
CREATE OR REPLACE FUNCTION public.validate_unique_code(
  p_code text DEFAULT NULL,
  p_slug text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT uc.*, p.discount_type, p.min_order_amount, p.link_target_path
    INTO r
  FROM public.unique_coupon_codes uc
  LEFT JOIN public.unique_code_policies p ON p.id = uc.policy_id
  WHERE (p_code IS NOT NULL AND upper(uc.code) = upper(p_code))
     OR (p_slug IS NOT NULL AND uc.link_slug = lower(p_slug))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF r.status <> 'active' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'inactive', 'status', r.status);
  END IF;
  IF r.expires_at IS NOT NULL AND r.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;
  IF r.valid_from > now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_yet_valid');
  END IF;
  IF r.uses_count >= r.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'exhausted');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', r.id, 'code', r.code, 'kind', r.kind,
    'user_id', r.user_id, 'link_slug', r.link_slug,
    'discount_type', r.discount_type, 'discount_value', r.discount_applied,
    'min_order_amount', r.min_order_amount,
    'target_path', r.link_target_path,
    'expires_at', r.expires_at,
    'remaining_uses', r.max_uses - r.uses_count
  );
END $$;

REVOKE ALL ON FUNCTION public.validate_unique_code(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_unique_code(text,text) TO anon, authenticated, service_role;
