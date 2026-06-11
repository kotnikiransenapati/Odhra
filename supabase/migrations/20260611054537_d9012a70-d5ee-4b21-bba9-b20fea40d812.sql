-- ===== Phase G Batch 51: Tamper-Evident Security Event Ledger =====
CREATE TABLE public.security_event_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','low','medium','high','critical')),
  actor_id UUID REFERENCES auth.users(id),
  subject_type TEXT,
  subject_id TEXT,
  ip INET,
  country_code TEXT,
  fingerprint_hash TEXT,
  correlation_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash TEXT,
  event_hash TEXT NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_event_ledger TO authenticated;
GRANT INSERT ON public.security_event_ledger TO authenticated;
GRANT ALL ON public.security_event_ledger TO service_role;
ALTER TABLE public.security_event_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read security event ledger" ON public.security_event_ledger
  FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_error_monitoring') OR public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE POLICY "Users may append own security events" ON public.security_event_ledger
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX idx_security_event_ledger_created ON public.security_event_ledger(created_at DESC);
CREATE INDEX idx_security_event_ledger_event ON public.security_event_ledger(event_type, occurred_at DESC);
CREATE INDEX idx_security_event_ledger_severity ON public.security_event_ledger(severity, occurred_at DESC);
CREATE INDEX idx_security_event_ledger_actor ON public.security_event_ledger(actor_id, occurred_at DESC);
CREATE INDEX idx_security_event_ledger_correlation ON public.security_event_ledger(correlation_id) WHERE correlation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_security_event(
  _source TEXT,
  _event_type TEXT,
  _severity TEXT DEFAULT 'info',
  _actor_id UUID DEFAULT NULL,
  _subject_type TEXT DEFAULT NULL,
  _subject_id TEXT DEFAULT NULL,
  _ip INET DEFAULT NULL,
  _country_code TEXT DEFAULT NULL,
  _fingerprint_hash TEXT DEFAULT NULL,
  _correlation_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID := gen_random_uuid();
  _prev TEXT;
  _hash TEXT;
  _occurred TIMESTAMPTZ := now();
  _sev TEXT := lower(COALESCE(_severity, 'info'));
BEGIN
  IF _source IS NULL OR btrim(_source) = '' OR _event_type IS NULL OR btrim(_event_type) = '' THEN
    RAISE EXCEPTION 'source and event_type are required';
  END IF;

  IF _sev NOT IN ('info','low','medium','high','critical') THEN
    RAISE EXCEPTION 'invalid severity: %', _severity;
  END IF;

  IF auth.uid() IS NOT NULL
     AND _actor_id IS DISTINCT FROM auth.uid()
     AND NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden actor mismatch';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('security_event_ledger_hash_chain'));

  SELECT event_hash INTO _prev
  FROM public.security_event_ledger
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  _hash := encode(extensions.digest(
    COALESCE(_prev, 'GENESIS') || '|' || _id::text || '|' || lower(_source) || '|' || lower(_event_type) || '|' || _sev || '|' ||
    COALESCE(_actor_id::text, '') || '|' || COALESCE(_subject_type, '') || '|' || COALESCE(_subject_id, '') || '|' ||
    COALESCE(_ip::text, '') || '|' || COALESCE(upper(_country_code), '') || '|' || COALESCE(_fingerprint_hash, '') || '|' ||
    COALESCE(_correlation_id, '') || '|' || COALESCE(_metadata, '{}'::jsonb)::text || '|' || _occurred::text,
    'sha256'
  ), 'hex');

  INSERT INTO public.security_event_ledger (
    id, source, event_type, severity, actor_id, subject_type, subject_id, ip, country_code,
    fingerprint_hash, correlation_id, metadata, previous_hash, event_hash, occurred_at
  ) VALUES (
    _id, lower(_source), lower(_event_type), _sev, _actor_id, _subject_type, _subject_id, _ip, upper(_country_code),
    _fingerprint_hash, _correlation_id, COALESCE(_metadata, '{}'::jsonb), _prev, _hash, _occurred
  );

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_security_event(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,INET,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_security_event(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,INET,TEXT,TEXT,TEXT,JSONB) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_security_event_stats(_hours INT DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
BEGIN
  IF NOT (public.admin_has_permission(auth.uid(), 'view_error_monitoring') OR public.admin_has_permission(auth.uid(), 'manage_admins')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'critical', COUNT(*) FILTER (WHERE severity = 'critical'),
    'high', COUNT(*) FILTER (WHERE severity = 'high'),
    'medium', COUNT(*) FILTER (WHERE severity = 'medium'),
    'low', COUNT(*) FILTER (WHERE severity = 'low'),
    'info', COUNT(*) FILTER (WHERE severity = 'info'),
    'sources', COALESCE(jsonb_object_agg(source, source_count), '{}'::jsonb),
    'last_event_at', MAX(last_event_at)
  ) INTO _result
  FROM (
    SELECT source, COUNT(*) AS source_count, MAX(occurred_at) AS last_event_at
    FROM public.security_event_ledger
    WHERE occurred_at >= now() - make_interval(hours => GREATEST(1, LEAST(COALESCE(_hours, 24), 720)))
    GROUP BY source
  ) s;

  RETURN COALESCE(_result, jsonb_build_object('total', 0, 'critical', 0, 'high', 0, 'medium', 0, 'low', 0, 'info', 0, 'sources', '{}'::jsonb, 'last_event_at', NULL));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_security_event_feed(
  _limit INT DEFAULT 100,
  _severity TEXT DEFAULT NULL,
  _source TEXT DEFAULT NULL
) RETURNS SETOF public.security_event_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.admin_has_permission(auth.uid(), 'view_error_monitoring') OR public.admin_has_permission(auth.uid(), 'manage_admins')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.security_event_ledger
  WHERE (_severity IS NULL OR severity = lower(_severity))
    AND (_source IS NULL OR source = lower(_source))
  ORDER BY occurred_at DESC, id DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_verify_security_ledger(_limit INT DEFAULT 1000)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _checked INT := 0;
  _broken_links INT := 0;
  _hash_mismatches INT := 0;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH ordered AS (
    SELECT *,
           LAG(event_hash) OVER (ORDER BY created_at, id) AS expected_previous
    FROM (
      SELECT * FROM public.security_event_ledger
      ORDER BY created_at DESC, id DESC
      LIMIT GREATEST(1, LEAST(COALESCE(_limit, 1000), 10000))
    ) recent
  ), verified AS (
    SELECT *,
      encode(extensions.digest(
        COALESCE(previous_hash, 'GENESIS') || '|' || id::text || '|' || source || '|' || event_type || '|' || severity || '|' ||
        COALESCE(actor_id::text, '') || '|' || COALESCE(subject_type, '') || '|' || COALESCE(subject_id, '') || '|' ||
        COALESCE(ip::text, '') || '|' || COALESCE(country_code, '') || '|' || COALESCE(fingerprint_hash, '') || '|' ||
        COALESCE(correlation_id, '') || '|' || metadata::text || '|' || occurred_at::text,
        'sha256'
      ), 'hex') AS recomputed_hash
    FROM ordered
  )
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE expected_previous IS NOT NULL AND previous_hash IS DISTINCT FROM expected_previous),
         COUNT(*) FILTER (WHERE event_hash IS DISTINCT FROM recomputed_hash)
  INTO _checked, _broken_links, _hash_mismatches
  FROM verified;

  RETURN jsonb_build_object(
    'checked', COALESCE(_checked, 0),
    'broken_links', COALESCE(_broken_links, 0),
    'hash_mismatches', COALESCE(_hash_mismatches, 0),
    'verified', COALESCE(_broken_links, 0) = 0 AND COALESCE(_hash_mismatches, 0) = 0
  );
END;
$$;

-- ===== Phase G Batch 52: Security Detection Rules & Findings =====
CREATE TABLE public.security_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  source TEXT,
  event_type TEXT NOT NULL,
  window_minutes INT NOT NULL DEFAULT 15 CHECK (window_minutes BETWEEN 1 AND 10080),
  threshold INT NOT NULL DEFAULT 5 CHECK (threshold BETWEEN 1 AND 100000),
  group_by TEXT NOT NULL DEFAULT 'actor_id' CHECK (group_by IN ('actor_id','ip','fingerprint_hash','correlation_id','country_code','global')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  cooldown_minutes INT NOT NULL DEFAULT 60 CHECK (cooldown_minutes BETWEEN 1 AND 10080),
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_detection_rules TO authenticated;
GRANT ALL ON public.security_detection_rules TO service_role;
ALTER TABLE public.security_detection_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage security detection rules" ON public.security_detection_rules
  FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE TABLE public.security_detection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.security_detection_rules(id) ON DELETE CASCADE,
  group_key TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  event_count INT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  window_ended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.security_detection_findings TO authenticated;
GRANT ALL ON public.security_detection_findings TO service_role;
ALTER TABLE public.security_detection_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read security detection findings" ON public.security_detection_findings
  FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_error_monitoring') OR public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE POLICY "Admins update security detection findings" ON public.security_detection_findings
  FOR UPDATE TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE INDEX idx_security_rules_active ON public.security_detection_rules(active, event_type);
CREATE INDEX idx_security_findings_status ON public.security_detection_findings(status, created_at DESC);
CREATE INDEX idx_security_findings_rule_group ON public.security_detection_findings(rule_id, group_key, created_at DESC);

CREATE TRIGGER trg_security_detection_rules_updated
  BEFORE UPDATE ON public.security_detection_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_security_detection_findings_updated
  BEFORE UPDATE ON public.security_detection_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.evaluate_security_detection_rules()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule public.security_detection_rules%ROWTYPE;
  _hit RECORD;
  _created INT := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _rule IN SELECT * FROM public.security_detection_rules WHERE active LOOP
    FOR _hit IN
      SELECT
        CASE _rule.group_by
          WHEN 'actor_id' THEN COALESCE(actor_id::text, 'anonymous')
          WHEN 'ip' THEN COALESCE(ip::text, 'unknown')
          WHEN 'fingerprint_hash' THEN COALESCE(fingerprint_hash, 'unknown')
          WHEN 'correlation_id' THEN COALESCE(correlation_id, 'unknown')
          WHEN 'country_code' THEN COALESCE(country_code, 'unknown')
          ELSE 'global'
        END AS group_key,
        COUNT(*)::INT AS event_count,
        MIN(occurred_at) AS window_started_at,
        MAX(occurred_at) AS window_ended_at
      FROM public.security_event_ledger
      WHERE event_type = lower(_rule.event_type)
        AND (_rule.source IS NULL OR source = lower(_rule.source))
        AND occurred_at >= now() - make_interval(mins => _rule.window_minutes)
      GROUP BY 1
      HAVING COUNT(*) >= _rule.threshold
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.security_detection_findings f
        WHERE f.rule_id = _rule.id
          AND f.group_key = _hit.group_key
          AND f.created_at >= now() - make_interval(mins => _rule.cooldown_minutes)
          AND f.status IN ('open','acknowledged')
      ) THEN
        INSERT INTO public.security_detection_findings (
          rule_id, group_key, severity, event_count, window_started_at, window_ended_at, metadata
        ) VALUES (
          _rule.id, _hit.group_key, _rule.severity, _hit.event_count, _hit.window_started_at, _hit.window_ended_at,
          jsonb_build_object('rule_name', _rule.name, 'event_type', _rule.event_type, 'source', _rule.source, 'group_by', _rule.group_by)
        );
        UPDATE public.security_detection_rules SET last_triggered_at = now() WHERE id = _rule.id;
        _created := _created + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('created_findings', _created, 'evaluated_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_security_detection_rules() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_security_detection_rules() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_security_rules_list()
RETURNS SETOF public.security_detection_rules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.security_detection_rules ORDER BY active DESC, severity DESC, name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_security_rule(
  _id UUID,
  _name TEXT,
  _description TEXT,
  _source TEXT,
  _event_type TEXT,
  _window_minutes INT,
  _threshold INT,
  _group_by TEXT,
  _severity TEXT,
  _active BOOLEAN,
  _cooldown_minutes INT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rid UUID;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _name IS NULL OR btrim(_name) = '' OR _event_type IS NULL OR btrim(_event_type) = '' THEN
    RAISE EXCEPTION 'name and event type are required';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.security_detection_rules (
      name, description, source, event_type, window_minutes, threshold, group_by, severity, active, cooldown_minutes, created_by
    ) VALUES (
      btrim(_name), _description, NULLIF(lower(btrim(COALESCE(_source, ''))), ''), lower(btrim(_event_type)),
      COALESCE(_window_minutes, 15), COALESCE(_threshold, 5), COALESCE(_group_by, 'actor_id'), COALESCE(_severity, 'medium'),
      COALESCE(_active, TRUE), COALESCE(_cooldown_minutes, 60), auth.uid()
    ) RETURNING id INTO _rid;
  ELSE
    UPDATE public.security_detection_rules
       SET name = btrim(_name),
           description = _description,
           source = NULLIF(lower(btrim(COALESCE(_source, ''))), ''),
           event_type = lower(btrim(_event_type)),
           window_minutes = COALESCE(_window_minutes, 15),
           threshold = COALESCE(_threshold, 5),
           group_by = COALESCE(_group_by, 'actor_id'),
           severity = COALESCE(_severity, 'medium'),
           active = COALESCE(_active, TRUE),
           cooldown_minutes = COALESCE(_cooldown_minutes, 60),
           updated_at = now()
     WHERE id = _id
     RETURNING id INTO _rid;
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'security_rule.upsert', 'security_detection_rule', _rid::text,
          jsonb_build_object('name', _name, 'event_type', _event_type, 'severity', _severity));

  RETURN _rid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_security_rule(_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.security_detection_rules WHERE id = _id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'security_rule.delete', 'security_detection_rule', _id::text);

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_security_findings(
  _status TEXT DEFAULT NULL,
  _limit INT DEFAULT 100
) RETURNS TABLE (
  id UUID,
  rule_id UUID,
  rule_name TEXT,
  group_key TEXT,
  severity TEXT,
  event_count INT,
  window_started_at TIMESTAMPTZ,
  window_ended_at TIMESTAMPTZ,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.admin_has_permission(auth.uid(), 'view_error_monitoring') OR public.admin_has_permission(auth.uid(), 'manage_admins')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT f.id, f.rule_id, r.name, f.group_key, f.severity, f.event_count, f.window_started_at,
         f.window_ended_at, f.status, f.metadata, f.created_at
  FROM public.security_detection_findings f
  JOIN public.security_detection_rules r ON r.id = f.rule_id
  WHERE (_status IS NULL OR f.status = lower(_status))
  ORDER BY f.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_security_finding_status(_id UUID, _status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF lower(_status) NOT IN ('acknowledged','resolved') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.security_detection_findings
     SET status = lower(_status),
         acknowledged_by = CASE WHEN lower(_status) = 'acknowledged' THEN auth.uid() ELSE acknowledged_by END,
         acknowledged_at = CASE WHEN lower(_status) = 'acknowledged' THEN now() ELSE acknowledged_at END,
         resolved_by = CASE WHEN lower(_status) = 'resolved' THEN auth.uid() ELSE resolved_by END,
         resolved_at = CASE WHEN lower(_status) = 'resolved' THEN now() ELSE resolved_at END,
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'security_finding.status', 'security_detection_finding', _id::text, jsonb_build_object('status', lower(_status)));

  RETURN FOUND;
END;
$$;