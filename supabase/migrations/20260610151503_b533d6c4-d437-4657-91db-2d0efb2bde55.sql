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
        AND (r.scope = '*' OR c.service_key = r.scope);
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
REVOKE ALL ON FUNCTION public.admin_run_anomaly_detection(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_run_anomaly_detection(boolean) TO authenticated, service_role;