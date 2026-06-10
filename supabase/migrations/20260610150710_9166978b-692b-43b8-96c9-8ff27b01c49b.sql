-- Phase G Batch 23: Anomaly Detection Alerts
CREATE TABLE IF NOT EXISTS public.anomaly_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('error_count','error_rate','p95_latency_ms','heartbeat_stale','open_circuit_count')),
  scope text NOT NULL DEFAULT '*',
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  comparison text NOT NULL DEFAULT 'gte' CHECK (comparison IN ('gte','lte')),
  threshold numeric NOT NULL,
  window_minutes integer NOT NULL DEFAULT 15 CHECK (window_minutes BETWEEN 1 AND 1440),
  baseline_minutes integer NOT NULL DEFAULT 240 CHECK (baseline_minutes BETWEEN 15 AND 10080),
  min_samples integer NOT NULL DEFAULT 1 CHECK (min_samples >= 0),
  cooldown_minutes integer NOT NULL DEFAULT 60 CHECK (cooldown_minutes BETWEEN 1 AND 10080),
  notification_channels text[] NOT NULL DEFAULT ARRAY[]::text[],
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anomaly_alert_rules TO authenticated;
GRANT ALL ON public.anomaly_alert_rules TO service_role;
ALTER TABLE public.anomaly_alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage anomaly rules"
ON public.anomaly_alert_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.anomaly_alert_rules(id) ON DELETE SET NULL,
  metric text NOT NULL,
  scope text NOT NULL DEFAULT '*',
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','suppressed')),
  observed_value numeric NOT NULL,
  baseline_value numeric,
  threshold numeric NOT NULL,
  sample_count bigint NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.anomaly_alerts TO authenticated;
GRANT ALL ON public.anomaly_alerts TO service_role;
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read anomaly alerts"
ON public.anomaly_alerts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update anomaly alerts"
ON public.anomaly_alerts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages anomaly alerts"
ON public.anomaly_alerts FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_anomaly_rules_enabled ON public.anomaly_alert_rules (enabled, metric, scope);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_status_time ON public.anomaly_alerts (status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_rule_time ON public.anomaly_alerts (rule_id, detected_at DESC);

CREATE TRIGGER trg_anomaly_rules_updated_at
BEFORE UPDATE ON public.anomaly_alert_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_anomaly_alerts_updated_at
BEFORE UPDATE ON public.anomaly_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_run_anomaly_detection(_dry_run boolean DEFAULT false)
RETURNS TABLE(
  rule_id uuid,
  alert_id uuid,
  metric text,
  scope text,
  severity text,
  observed_value numeric,
  baseline_value numeric,
  threshold numeric,
  sample_count bigint,
  status text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  _observed numeric;
  _baseline numeric;
  _samples bigint;
  _breached boolean;
  _recent boolean;
  _alert_id uuid;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN SELECT * FROM public.anomaly_alert_rules WHERE enabled = true ORDER BY severity DESC, name LOOP
    _observed := 0; _baseline := NULL; _samples := 0; _alert_id := NULL;

    IF r.metric = 'error_count' THEN
      SELECT COUNT(*)::numeric, COUNT(*)::bigint INTO _observed, _samples
      FROM public.error_logs e
      WHERE e.created_at >= now() - make_interval(mins => r.window_minutes)
        AND (r.scope = '*' OR e.function_name = r.scope OR e.source = r.scope)
        AND lower(COALESCE(e.error_level, 'error')) IN ('error','critical');

      SELECT ROUND(COALESCE(AVG(bucket_count),0),2) INTO _baseline
      FROM (
        SELECT date_bin(make_interval(mins => r.window_minutes), e.created_at, now() - make_interval(mins => r.baseline_minutes)) AS b,
               COUNT(*)::numeric AS bucket_count
        FROM public.error_logs e
        WHERE e.created_at >= now() - make_interval(mins => r.baseline_minutes)
          AND e.created_at < now() - make_interval(mins => r.window_minutes)
          AND (r.scope = '*' OR e.function_name = r.scope OR e.source = r.scope)
          AND lower(COALESCE(e.error_level, 'error')) IN ('error','critical')
        GROUP BY 1
      ) s;
    ELSIF r.metric = 'error_rate' THEN
      SELECT ROUND((COUNT(*) FILTER (WHERE m.status_code >= 500))::numeric / NULLIF(COUNT(*),0)::numeric * 100, 2), COUNT(*)::bigint
      INTO _observed, _samples
      FROM public.edge_function_metrics m
      WHERE m.created_at >= now() - make_interval(mins => r.window_minutes)
        AND (r.scope = '*' OR m.function_name = r.scope);

      SELECT ROUND(AVG(rate),2) INTO _baseline
      FROM (
        SELECT date_bin(make_interval(mins => r.window_minutes), m.created_at, now() - make_interval(mins => r.baseline_minutes)) AS b,
               (COUNT(*) FILTER (WHERE m.status_code >= 500))::numeric / NULLIF(COUNT(*),0)::numeric * 100 AS rate
        FROM public.edge_function_metrics m
        WHERE m.created_at >= now() - make_interval(mins => r.baseline_minutes)
          AND m.created_at < now() - make_interval(mins => r.window_minutes)
          AND (r.scope = '*' OR m.function_name = r.scope)
        GROUP BY 1
      ) s;
      _observed := COALESCE(_observed, 0);
    ELSIF r.metric = 'p95_latency_ms' THEN
      SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY m.duration_ms)::numeric, COUNT(*)::bigint
      INTO _observed, _samples
      FROM public.edge_function_metrics m
      WHERE m.created_at >= now() - make_interval(mins => r.window_minutes)
        AND (r.scope = '*' OR m.function_name = r.scope);

      SELECT ROUND(AVG(p95),2) INTO _baseline
      FROM (
        SELECT date_bin(make_interval(mins => r.window_minutes), m.created_at, now() - make_interval(mins => r.baseline_minutes)) AS b,
               percentile_cont(0.95) WITHIN GROUP (ORDER BY m.duration_ms)::numeric AS p95
        FROM public.edge_function_metrics m
        WHERE m.created_at >= now() - make_interval(mins => r.baseline_minutes)
          AND m.created_at < now() - make_interval(mins => r.window_minutes)
          AND (r.scope = '*' OR m.function_name = r.scope)
        GROUP BY 1
      ) s;
      _observed := COALESCE(_observed, 0);
    ELSIF r.metric = 'heartbeat_stale' THEN
      WITH latest AS (
        SELECT DISTINCT ON (h.service_name) h.service_name, h.observed_at
        FROM public.system_heartbeats h
        WHERE (r.scope = '*' OR h.service_name = r.scope)
        ORDER BY h.service_name, h.observed_at DESC
      )
      SELECT COUNT(*) FILTER (WHERE observed_at < now() - make_interval(mins => r.window_minutes))::numeric,
             COUNT(*)::bigint
      INTO _observed, _samples
      FROM latest;
      _baseline := 0;
    ELSIF r.metric = 'open_circuit_count' THEN
      SELECT COUNT(*)::numeric, COUNT(*)::bigint INTO _observed, _samples
      FROM public.outbound_circuit_breakers c
      WHERE c.state = 'open'
        AND (r.scope = '*' OR c.service_name = r.scope);
      _baseline := 0;
    END IF;

    _observed := COALESCE(_observed, 0);
    _samples := COALESCE(_samples, 0);
    _breached := _samples >= r.min_samples AND CASE r.comparison WHEN 'lte' THEN _observed <= r.threshold ELSE _observed >= r.threshold END;

    IF _breached THEN
      SELECT EXISTS (
        SELECT 1 FROM public.anomaly_alerts a
        WHERE a.rule_id = r.id
          AND a.detected_at >= now() - make_interval(mins => r.cooldown_minutes)
          AND a.status IN ('open','acknowledged')
      ) INTO _recent;

      IF NOT _dry_run AND NOT _recent THEN
        INSERT INTO public.anomaly_alerts(rule_id, metric, scope, severity, observed_value, baseline_value, threshold, sample_count, details)
        VALUES (r.id, r.metric, r.scope, r.severity, _observed, _baseline, r.threshold, _samples,
                jsonb_build_object('rule_name', r.name, 'window_minutes', r.window_minutes, 'comparison', r.comparison))
        RETURNING id INTO _alert_id;
      END IF;

      rule_id := r.id; alert_id := _alert_id; metric := r.metric; scope := r.scope; severity := r.severity;
      observed_value := _observed; baseline_value := _baseline; threshold := r.threshold; sample_count := _samples;
      status := CASE WHEN _dry_run THEN 'dry_run' WHEN _recent THEN 'suppressed' ELSE 'open' END;
      RETURN NEXT;
    END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_run_anomaly_detection(boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_anomaly_alert_status(_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('acknowledged','resolved','suppressed') THEN RAISE EXCEPTION 'invalid status'; END IF;

  UPDATE public.anomaly_alerts
  SET status = _status,
      acknowledged_by = CASE WHEN _status = 'acknowledged' THEN auth.uid() ELSE acknowledged_by END,
      acknowledged_at = CASE WHEN _status = 'acknowledged' THEN now() ELSE acknowledged_at END,
      resolved_at = CASE WHEN _status = 'resolved' THEN now() ELSE resolved_at END,
      updated_at = now()
  WHERE id = _id;

  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'anomaly_alert.status', 'anomaly_alert', _id::text, jsonb_build_object('status', _status));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_anomaly_alert_status(uuid,text) TO authenticated;

-- Phase G Batch 24: Release Notes Publisher
CREATE TABLE IF NOT EXISTS public.release_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text NOT NULL,
  body text NOT NULL,
  version text,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','customers','vendors','admins')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.release_notes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.release_notes TO authenticated;
GRANT ALL ON public.release_notes TO service_role;
ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published release notes are public"
ON public.release_notes FOR SELECT TO anon, authenticated
USING (status = 'published' AND published_at IS NOT NULL AND published_at <= now());
CREATE POLICY "Admins read all release notes"
ON public.release_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage release notes"
ON public.release_notes FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_release_notes_public ON public.release_notes (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_release_notes_audience ON public.release_notes (audience, status, published_at DESC);
CREATE TRIGGER trg_release_notes_updated_at
BEFORE UPDATE ON public.release_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_upsert_release_note(
  _id uuid,
  _title text,
  _slug text,
  _summary text,
  _body text,
  _version text DEFAULT NULL,
  _audience text DEFAULT 'all',
  _status text DEFAULT 'draft',
  _tags text[] DEFAULT ARRAY[]::text[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _note_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(trim(_title)) < 3 OR length(trim(_slug)) < 3 OR length(trim(_summary)) < 10 OR length(trim(_body)) < 20 THEN
    RAISE EXCEPTION 'release note is incomplete';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.release_notes(title, slug, summary, body, version, audience, status, tags, published_at, created_by, updated_by)
    VALUES (trim(_title), lower(trim(_slug)), trim(_summary), trim(_body), nullif(trim(COALESCE(_version,'')), ''), _audience, _status, COALESCE(_tags, ARRAY[]::text[]),
            CASE WHEN _status = 'published' THEN now() ELSE NULL END, auth.uid(), auth.uid())
    RETURNING id INTO _note_id;
  ELSE
    UPDATE public.release_notes
    SET title = trim(_title), slug = lower(trim(_slug)), summary = trim(_summary), body = trim(_body),
        version = nullif(trim(COALESCE(_version,'')), ''), audience = _audience, status = _status,
        tags = COALESCE(_tags, ARRAY[]::text[]), updated_by = auth.uid(),
        published_at = CASE WHEN _status = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
        updated_at = now()
    WHERE id = _id
    RETURNING id INTO _note_id;
  END IF;

  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'release_note.upsert', 'release_note', _note_id::text,
          jsonb_build_object('title', _title, 'status', _status, 'audience', _audience));
  RETURN _note_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_upsert_release_note(uuid,text,text,text,text,text,text,text,text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_publish_release_note(_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('draft','published','archived') THEN RAISE EXCEPTION 'invalid status'; END IF;

  UPDATE public.release_notes
  SET status = _status,
      published_at = CASE WHEN _status = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = _id;

  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'release_note.status', 'release_note', _id::text, jsonb_build_object('status', _status));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_publish_release_note(uuid,text) TO authenticated;

-- Compatibility fix for prior maintenance/secret audit functions.
CREATE OR REPLACE FUNCTION public.admin_start_maintenance(
  _scope text, _reason text, _allow_admins boolean DEFAULT true, _ends_at timestamptz DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.maintenance_windows(scope, reason, allow_admins, ends_at, created_by)
  VALUES (_scope, _reason, _allow_admins, _ends_at, auth.uid())
  RETURNING id INTO _id;
  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'maintenance.start', 'maintenance_window', _id::text,
          jsonb_build_object('scope',_scope,'reason',_reason,'ends_at',_ends_at));
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_start_maintenance(text,text,boolean,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_end_maintenance(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.maintenance_windows SET ends_at = now(), updated_at = now() WHERE id = _id;
  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'maintenance.end', 'maintenance_window', _id::text, jsonb_build_object('ended_at', now()));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_end_maintenance(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_secret_rotated(_name text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.managed_secrets
    SET last_rotated_at = now(), rotation_count = rotation_count + 1, notes = COALESCE(_note, notes), updated_at = now()
  WHERE name = _name;
  IF NOT FOUND THEN RAISE EXCEPTION 'secret % not found', _name; END IF;
  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(),'secret.rotated','managed_secret', _name, jsonb_build_object('note', _note));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_mark_secret_rotated(text,text) TO authenticated;