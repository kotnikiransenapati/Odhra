
-- =====================================================================
-- BATCH 43 — PUSH NOTIFICATION DELIVERABILITY
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.push_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id uuid,
  campaign_id uuid,
  template_key text,
  platform text,                  -- 'web' | 'ios' | 'android'
  provider text,                  -- 'fcm' | 'apns' | 'webpush'
  status text NOT NULL CHECK (status IN ('queued','sent','delivered','failed','clicked','dismissed','expired')),
  error_code text,
  error_message text,
  payload_size_bytes integer,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_delivery_events TO authenticated;
GRANT ALL ON public.push_delivery_events TO service_role;

ALTER TABLE public.push_delivery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_events_admin_read" ON public.push_delivery_events
  FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_error_monitoring'));

CREATE POLICY "push_events_service_all" ON public.push_delivery_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_push_events_occurred ON public.push_delivery_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_events_status ON public.push_delivery_events (status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_events_template ON public.push_delivery_events (template_key, occurred_at DESC);

-- Stats RPC
CREATE OR REPLACE FUNCTION public.admin_push_deliverability_stats(_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - make_interval(hours => GREATEST(_hours, 1));
  _total bigint; _sent bigint; _delivered bigint; _failed bigint; _clicked bigint;
  _top_templates jsonb; _platforms jsonb;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status='sent'),
         COUNT(*) FILTER (WHERE status='delivered'),
         COUNT(*) FILTER (WHERE status='failed'),
         COUNT(*) FILTER (WHERE status='clicked')
    INTO _total, _sent, _delivered, _failed, _clicked
    FROM public.push_delivery_events
   WHERE occurred_at >= _since;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO _top_templates FROM (
    SELECT template_key,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status='delivered') AS delivered,
           COUNT(*) FILTER (WHERE status='failed') AS failed,
           COUNT(*) FILTER (WHERE status='clicked') AS clicked
      FROM public.push_delivery_events
     WHERE occurred_at >= _since AND template_key IS NOT NULL
     GROUP BY template_key
     ORDER BY total DESC
     LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(p), '[]'::jsonb) INTO _platforms FROM (
    SELECT COALESCE(platform,'unknown') AS platform,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status='failed') AS failed
      FROM public.push_delivery_events
     WHERE occurred_at >= _since
     GROUP BY platform
     ORDER BY total DESC
  ) p;

  RETURN jsonb_build_object(
    'total', COALESCE(_total,0),
    'sent', COALESCE(_sent,0),
    'delivered', COALESCE(_delivered,0),
    'failed', COALESCE(_failed,0),
    'clicked', COALESCE(_clicked,0),
    'top_templates', _top_templates,
    'platforms', _platforms,
    'window_hours', _hours
  );
END $$;

GRANT EXECUTE ON FUNCTION public.admin_push_deliverability_stats(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_push_recent_events(_limit integer DEFAULT 100, _only_failed boolean DEFAULT false)
RETURNS SETOF public.push_delivery_events
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT * FROM public.push_delivery_events
     WHERE (NOT _only_failed) OR status IN ('failed','expired')
     ORDER BY occurred_at DESC
     LIMIT GREATEST(_limit, 1);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_push_recent_events(integer, boolean) TO authenticated;

-- =====================================================================
-- BATCH 44 — TWO-FACTOR AUTH POLICY & ENROLLMENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.two_factor_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role text NOT NULL UNIQUE CHECK (target_role IN ('admin','vendor','customer')),
  required boolean NOT NULL DEFAULT false,
  allowed_methods text[] NOT NULL DEFAULT ARRAY['totp']::text[],
  grace_period_days integer NOT NULL DEFAULT 7 CHECK (grace_period_days >= 0),
  enforce_after timestamptz,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.two_factor_policies TO authenticated;
GRANT ALL ON public.two_factor_policies TO service_role;
ALTER TABLE public.two_factor_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "2fa_policies_admin_all" ON public.two_factor_policies
  FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(),'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(),'manage_admins'));

CREATE POLICY "2fa_policies_service_all" ON public.two_factor_policies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.two_factor_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('totp','webauthn','sms','email')),
  label text,
  verified boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, method)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.two_factor_enrollments TO authenticated;
GRANT ALL ON public.two_factor_enrollments TO service_role;
ALTER TABLE public.two_factor_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "2fa_enroll_self_select" ON public.two_factor_enrollments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "2fa_enroll_self_manage" ON public.two_factor_enrollments
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "2fa_enroll_admin_read" ON public.two_factor_enrollments
  FOR SELECT TO authenticated USING (public.admin_has_permission(auth.uid(),'manage_admins'));
CREATE POLICY "2fa_enroll_service_all" ON public.two_factor_enrollments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_2fa_enroll_user ON public.two_factor_enrollments (user_id);

-- Updated_at trigger using existing helper
DROP TRIGGER IF EXISTS trg_2fa_policies_updated ON public.two_factor_policies;
CREATE TRIGGER trg_2fa_policies_updated BEFORE UPDATE ON public.two_factor_policies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_2fa_enroll_updated ON public.two_factor_enrollments;
CREATE TRIGGER trg_2fa_enroll_updated BEFORE UPDATE ON public.two_factor_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper for auth flows
CREATE OR REPLACE FUNCTION public.is_two_factor_required(_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT required AND (enforce_after IS NULL OR enforce_after <= now())
       FROM public.two_factor_policies WHERE target_role = _role),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_two_factor_required(text) TO authenticated, anon;

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_two_factor_policies_list()
RETURNS SETOF public.two_factor_policies
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.two_factor_policies ORDER BY target_role;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_two_factor_policies_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_two_factor_policy(
  _target_role text,
  _required boolean,
  _allowed_methods text[],
  _grace_period_days integer,
  _enforce_after timestamptz,
  _notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _target_role NOT IN ('admin','vendor','customer') THEN
    RAISE EXCEPTION 'invalid target_role';
  END IF;
  IF array_length(_allowed_methods, 1) IS NULL THEN
    RAISE EXCEPTION 'at least one method required';
  END IF;

  INSERT INTO public.two_factor_policies (target_role, required, allowed_methods, grace_period_days, enforce_after, notes, updated_by)
  VALUES (_target_role, _required, _allowed_methods, COALESCE(_grace_period_days,7), _enforce_after, _notes, auth.uid())
  ON CONFLICT (target_role) DO UPDATE
    SET required = EXCLUDED.required,
        allowed_methods = EXCLUDED.allowed_methods,
        grace_period_days = EXCLUDED.grace_period_days,
        enforce_after = EXCLUDED.enforce_after,
        notes = EXCLUDED.notes,
        updated_by = auth.uid(),
        updated_at = now()
  RETURNING id INTO _id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'two_factor_policy.upsert', 'two_factor_policy', _id::text,
          jsonb_build_object('target_role', _target_role, 'required', _required, 'methods', _allowed_methods));

  RETURN _id;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_two_factor_policy(text, boolean, text[], integer, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_two_factor_enrollments(_limit integer DEFAULT 100)
RETURNS TABLE (id uuid, user_id uuid, email text, method text, label text, verified boolean, last_used_at timestamptz, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT e.id, e.user_id, u.email::text, e.method, e.label, e.verified, e.last_used_at, e.created_at
      FROM public.two_factor_enrollments e
      LEFT JOIN auth.users u ON u.id = e.user_id
     ORDER BY e.created_at DESC
     LIMIT GREATEST(_limit,1);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_two_factor_enrollments(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reset_two_factor_enrollment(_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _user uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT user_id INTO _user FROM public.two_factor_enrollments WHERE id = _id;
  IF _user IS NULL THEN RETURN false; END IF;
  DELETE FROM public.two_factor_enrollments WHERE id = _id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'two_factor.reset', 'two_factor_enrollment', _id::text,
          jsonb_build_object('user_id', _user));
  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_reset_two_factor_enrollment(uuid) TO authenticated;

-- Seed default policies (not required)
INSERT INTO public.two_factor_policies (target_role, required, allowed_methods, grace_period_days)
VALUES
  ('admin', false, ARRAY['totp','webauthn'], 7),
  ('vendor', false, ARRAY['totp'], 14),
  ('customer', false, ARRAY['totp','email'], 30)
ON CONFLICT (target_role) DO NOTHING;
