
CREATE TABLE IF NOT EXISTS public.mutation_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  idempotency_key text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_hash text,
  response jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  http_status integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE (scope, idempotency_key)
);

CREATE INDEX IF NOT EXISTS mutation_idempotency_expires_idx
  ON public.mutation_idempotency (expires_at)
  WHERE status <> 'pending';

GRANT SELECT, INSERT, UPDATE ON public.mutation_idempotency TO authenticated;
GRANT ALL ON public.mutation_idempotency TO service_role;

ALTER TABLE public.mutation_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages idempotency"
  ON public.mutation_idempotency FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "admins can view idempotency"
  ON public.mutation_idempotency FOR SELECT
  TO authenticated
  USING (public._caller_is_active_admin());

CREATE OR REPLACE FUNCTION public.claim_mutation_key(
  _scope text,
  _key text,
  _user_id uuid,
  _request_hash text
) RETURNS TABLE (claimed boolean, cached jsonb, http_status int, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.mutation_idempotency%ROWTYPE;
BEGIN
  INSERT INTO public.mutation_idempotency (scope, idempotency_key, user_id, request_hash)
  VALUES (_scope, _key, _user_id, _request_hash)
  ON CONFLICT (scope, idempotency_key) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NOT NULL THEN
    RETURN QUERY SELECT true, NULL::jsonb, NULL::int, 'pending'::text;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.mutation_idempotency
  WHERE scope = _scope AND idempotency_key = _key;

  IF _request_hash IS NOT NULL AND v_row.request_hash IS NOT NULL
     AND v_row.request_hash <> _request_hash THEN
    RAISE EXCEPTION 'idempotency_key_conflict' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY SELECT false, v_row.response, v_row.http_status, v_row.status;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_mutation_key(text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_mutation_key(text,text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_mutation_key(
  _scope text,
  _key text,
  _response jsonb,
  _http_status int,
  _success boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mutation_idempotency
  SET response = _response,
      http_status = _http_status,
      status = CASE WHEN _success THEN 'completed' ELSE 'failed' END,
      completed_at = now()
  WHERE scope = _scope AND idempotency_key = _key;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_mutation_key(text,text,jsonb,int,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_mutation_key(text,text,jsonb,int,boolean) TO service_role;

CREATE TABLE IF NOT EXISTS public.kill_switches (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_enabled boolean NOT NULL DEFAULT true,
  reason text,
  toggled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  toggled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.kill_switches TO anon, authenticated;
GRANT ALL ON public.kill_switches TO service_role;

ALTER TABLE public.kill_switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kill switches public read"
  ON public.kill_switches FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admins manage kill switches"
  ON public.kill_switches FOR ALL
  TO authenticated
  USING (public._caller_is_active_admin())
  WITH CHECK (public._caller_is_active_admin());

INSERT INTO public.kill_switches (key, label, description, category) VALUES
  ('checkout',          'Checkout',            'Disables order placement across all payment methods.',                   'commerce'),
  ('razorpay_payments', 'Razorpay Payments',   'Disables Razorpay order creation and verification.',                     'payments'),
  ('cod_orders',        'Cash on Delivery',    'Disables COD order creation.',                                            'payments'),
  ('signups',           'New Signups',         'Blocks new account registration.',                                        'auth'),
  ('ai_chatbot',        'AI Chatbot',          'Disables the storefront AI assistant.',                                   'ai'),
  ('email_campaigns',   'Email Campaigns',     'Pauses outbound marketing email sends.',                                  'marketing'),
  ('push_notifications','Push Notifications',  'Pauses outbound push notification campaigns.',                            'marketing'),
  ('whatsapp_outbound', 'WhatsApp Outbound',   'Pauses outbound WhatsApp messages.',                                      'marketing'),
  ('vendor_onboarding', 'Vendor Onboarding',   'Blocks new vendor signup and onboarding.',                                'vendor'),
  ('reviews_submit',    'Review Submission',   'Blocks new product review submissions.',                                  'content'),
  ('referrals',         'Referral Rewards',    'Pauses awarding referral loyalty points.',                                'rewards'),
  ('loyalty_redeem',    'Loyalty Redemption',  'Blocks redemption of loyalty points at checkout.',                        'rewards')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_kill_switch_active(_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT NOT is_enabled FROM public.kill_switches WHERE key = _key), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_kill_switch_active(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.toggle_kill_switch(_key text, _enabled boolean, _reason text)
RETURNS public.kill_switches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.kill_switches;
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.kill_switches
  SET is_enabled = _enabled,
      reason = _reason,
      toggled_by = auth.uid(),
      toggled_at = now()
  WHERE key = _key
  RETURNING * INTO v_row;

  IF v_row.key IS NULL THEN
    RAISE EXCEPTION 'kill switch not found: %', _key;
  END IF;

  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_values)
  VALUES (
    auth.uid(),
    CASE WHEN _enabled THEN 'killswitch.enable' ELSE 'killswitch.disable' END,
    'kill_switch',
    _key,
    jsonb_build_object('enabled', _enabled, 'reason', _reason)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_kill_switch(text,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_kill_switch(text,boolean,text) TO authenticated;
