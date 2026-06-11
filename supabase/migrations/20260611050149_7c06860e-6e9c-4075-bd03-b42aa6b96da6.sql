
-- BATCH 41: LOGIN SECURITY CENTER
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash text,
  ip_hash text,
  ip_inet inet,
  success boolean NOT NULL DEFAULT false,
  failure_reason text,
  user_agent text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_time ON public.login_attempts (attempted_at DESC);
CREATE INDEX idx_login_attempts_email ON public.login_attempts (email_hash, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts (ip_hash, attempted_at DESC);

GRANT SELECT ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view login attempts" ON public.login_attempts
  FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'));
CREATE POLICY "Service inserts attempts" ON public.login_attempts
  FOR INSERT TO service_role WITH CHECK (true);

CREATE TABLE public.login_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type text NOT NULL CHECK (identifier_type IN ('ip','email')),
  identifier_hash text NOT NULL,
  identifier_label text,
  attempt_count int NOT NULL DEFAULT 0,
  locked_until timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  unlocked_at timestamptz,
  unlocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (identifier_type, identifier_hash)
);
CREATE INDEX idx_login_lockouts_active ON public.login_lockouts (locked_until) WHERE unlocked_at IS NULL;

GRANT SELECT ON public.login_lockouts TO authenticated;
GRANT ALL ON public.login_lockouts TO service_role;
ALTER TABLE public.login_lockouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view lockouts" ON public.login_lockouts
  FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'));
CREATE POLICY "Service manages lockouts" ON public.login_lockouts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public._login_hash(_value text)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT CASE WHEN _value IS NULL OR _value = '' THEN NULL
              ELSE encode(extensions.digest(lower(trim(_value)), 'sha256'), 'hex') END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  _email text, _ip text, _success boolean,
  _reason text DEFAULT NULL, _user_agent text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email_hash text := public._login_hash(_email);
  v_ip_hash text := public._login_hash(_ip);
  v_recent_fails int;
BEGIN
  INSERT INTO public.login_attempts (email_hash, ip_hash, ip_inet, success, failure_reason, user_agent)
  VALUES (v_email_hash, v_ip_hash,
          CASE WHEN _ip ~ '^[0-9a-fA-F:.]+$' THEN _ip::inet ELSE NULL END,
          _success, _reason, _user_agent);
  IF _success THEN RETURN; END IF;
  IF v_ip_hash IS NOT NULL THEN
    SELECT count(*) INTO v_recent_fails FROM public.login_attempts
     WHERE ip_hash = v_ip_hash AND success = false
       AND attempted_at > now() - interval '15 minutes';
    IF v_recent_fails >= 5 THEN
      INSERT INTO public.login_lockouts
        (identifier_type, identifier_hash, identifier_label, attempt_count, locked_until, reason)
      VALUES ('ip', v_ip_hash, left(_ip, 64), v_recent_fails, now() + interval '30 minutes',
              'auto: 5+ failed attempts in 15min')
      ON CONFLICT (identifier_type, identifier_hash) DO UPDATE
      SET attempt_count = EXCLUDED.attempt_count,
          locked_until = GREATEST(public.login_lockouts.locked_until, EXCLUDED.locked_until),
          reason = EXCLUDED.reason, unlocked_at = NULL, unlocked_by = NULL;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_identifier_locked(_type text, _value text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.login_lockouts
    WHERE identifier_type = _type
      AND identifier_hash = public._login_hash(_value)
      AND unlocked_at IS NULL
      AND locked_until > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_login_security_stats(_hours int DEFAULT 24)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'total', count(*),
    'successes', count(*) FILTER (WHERE success),
    'failures', count(*) FILTER (WHERE NOT success),
    'unique_ips', count(DISTINCT ip_hash),
    'unique_emails', count(DISTINCT email_hash),
    'active_lockouts', (SELECT count(*) FROM public.login_lockouts
                        WHERE unlocked_at IS NULL AND locked_until > now())
  ) INTO result
  FROM public.login_attempts
  WHERE attempted_at > now() - make_interval(hours => _hours);
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_recent_login_attempts(
  _limit int DEFAULT 100, _only_failed boolean DEFAULT false
) RETURNS SETOF public.login_attempts
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.login_attempts
  WHERE public.admin_has_permission(auth.uid(), 'manage_admins')
    AND (NOT _only_failed OR success = false)
  ORDER BY attempted_at DESC
  LIMIT LEAST(_limit, 500);
$$;

CREATE OR REPLACE FUNCTION public.admin_login_lockouts_list()
RETURNS SETOF public.login_lockouts
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.login_lockouts
  WHERE public.admin_has_permission(auth.uid(), 'manage_admins')
  ORDER BY (unlocked_at IS NULL AND locked_until > now()) DESC, locked_until DESC
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.admin_unlock_identifier(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.login_lockouts
     SET unlocked_at = now(), unlocked_by = auth.uid()
   WHERE id = _id AND unlocked_at IS NULL;
  INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details)
  VALUES ('login_lockout.unlock', 'login_lockout', _id, auth.uid(), '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_lock_identifier(
  _type text, _identifier text, _minutes int DEFAULT 30, _reason text DEFAULT 'manual lock'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _type NOT IN ('ip','email') THEN RAISE EXCEPTION 'invalid type'; END IF;
  INSERT INTO public.login_lockouts
    (identifier_type, identifier_hash, identifier_label, attempt_count, locked_until, reason)
  VALUES (_type, public._login_hash(_identifier), left(_identifier, 64), 0,
          now() + make_interval(mins => GREATEST(_minutes,1)), _reason)
  ON CONFLICT (identifier_type, identifier_hash) DO UPDATE
  SET locked_until = EXCLUDED.locked_until, reason = EXCLUDED.reason,
      unlocked_at = NULL, unlocked_by = NULL
  RETURNING id INTO v_id;
  INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details)
  VALUES ('login_lockout.create', 'login_lockout', v_id, auth.uid(),
          jsonb_build_object('type', _type, 'minutes', _minutes, 'reason', _reason));
  RETURN v_id;
END $$;

-- BATCH 42: SMS DELIVERABILITY MONITOR
CREATE TABLE public.sms_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'unknown',
  provider_message_id text,
  template_key text,
  recipient_hash text,
  country_code text,
  status text NOT NULL CHECK (status IN ('queued','sent','delivered','failed','undelivered')),
  error_code text,
  error_message text,
  segment_count int DEFAULT 1,
  cost_cents int,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_events_time ON public.sms_delivery_events (occurred_at DESC);
CREATE INDEX idx_sms_events_status ON public.sms_delivery_events (status, occurred_at DESC);
CREATE INDEX idx_sms_events_template ON public.sms_delivery_events (template_key, occurred_at DESC);

GRANT SELECT ON public.sms_delivery_events TO authenticated;
GRANT ALL ON public.sms_delivery_events TO service_role;
ALTER TABLE public.sms_delivery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view sms events" ON public.sms_delivery_events
  FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_error_monitoring'));
CREATE POLICY "Service inserts sms events" ON public.sms_delivery_events
  FOR INSERT TO service_role WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.admin_sms_deliverability_stats(_hours int DEFAULT 24)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  WITH base AS (
    SELECT * FROM public.sms_delivery_events
     WHERE occurred_at > now() - make_interval(hours => _hours)
  ),
  by_template AS (
    SELECT template_key,
           count(*) AS total,
           count(*) FILTER (WHERE status = 'delivered') AS delivered,
           count(*) FILTER (WHERE status IN ('failed','undelivered')) AS failed
    FROM base WHERE template_key IS NOT NULL GROUP BY template_key
    ORDER BY total DESC LIMIT 10
  ),
  by_country AS (
    SELECT country_code,
           count(*) AS total,
           count(*) FILTER (WHERE status IN ('failed','undelivered')) AS failed
    FROM base WHERE country_code IS NOT NULL GROUP BY country_code
    ORDER BY total DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM base),
    'delivered', (SELECT count(*) FROM base WHERE status='delivered'),
    'sent', (SELECT count(*) FROM base WHERE status='sent'),
    'failed', (SELECT count(*) FROM base WHERE status IN ('failed','undelivered')),
    'queued', (SELECT count(*) FROM base WHERE status='queued'),
    'segments', (SELECT COALESCE(sum(segment_count),0) FROM base),
    'cost_cents', (SELECT COALESCE(sum(cost_cents),0) FROM base),
    'top_templates', (SELECT COALESCE(jsonb_agg(to_jsonb(by_template)),'[]'::jsonb) FROM by_template),
    'by_country', (SELECT COALESCE(jsonb_agg(to_jsonb(by_country)),'[]'::jsonb) FROM by_country)
  ) INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_sms_recent_events(
  _limit int DEFAULT 100, _status text DEFAULT NULL
) RETURNS SETOF public.sms_delivery_events
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.sms_delivery_events
  WHERE public.admin_has_permission(auth.uid(), 'view_error_monitoring')
    AND (_status IS NULL OR status = _status)
  ORDER BY occurred_at DESC
  LIMIT LEAST(_limit, 500);
$$;
