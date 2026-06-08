
-- Phase 3 security hardening: P0 findings

-- 1) cookie_consents: tighten anonymous update/delete/select
DROP POLICY IF EXISTS "Users can update their own cookie consent" ON public.cookie_consents;
DROP POLICY IF EXISTS "Users can view their own cookie consent" ON public.cookie_consents;
DROP POLICY IF EXISTS "Users can delete their own cookie consent" ON public.cookie_consents;

CREATE POLICY "Users can view their own cookie consent"
  ON public.cookie_consents FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own cookie consent"
  ON public.cookie_consents FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own cookie consent"
  ON public.cookie_consents FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2) referral_codes: stop leaking user_id to anonymous lookup
DROP POLICY IF EXISTS "Anyone can look up active referral codes by code" ON public.referral_codes;

CREATE OR REPLACE FUNCTION public.lookup_referral_code(p_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'code', code,
    'is_active', is_active
  )
  FROM public.referral_codes
  WHERE code = upper(trim(p_code)) AND is_active = true
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_referral_code(text) TO authenticated, service_role;

-- 3) products.cost_price: remove anonymous visibility
REVOKE SELECT (cost_price) ON public.products FROM anon;
-- authenticated retains access (vendors/admins need it; row-level policies still enforce ownership)
