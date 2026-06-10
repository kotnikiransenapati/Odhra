
-- Drop leftovers from previous partial run
DROP TABLE IF EXISTS public.edge_function_metrics CASCADE;
DROP TABLE IF EXISTS public.system_heartbeats CASCADE;

-- =================== Heartbeats ===================
CREATE TABLE public.system_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  service_kind text NOT NULL CHECK (service_kind IN ('edge_function','cron','external_api','database','queue','custom')),
  status text NOT NULL CHECK (status IN ('healthy','degraded','down','unknown')),
  latency_ms integer,
  detail jsonb DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_heartbeats_service_time ON public.system_heartbeats (service_name, observed_at DESC);
CREATE INDEX idx_heartbeats_observed_desc ON public.system_heartbeats (observed_at DESC);

GRANT SELECT ON public.system_heartbeats TO authenticated;
GRANT ALL ON public.system_heartbeats TO service_role;
ALTER TABLE public.system_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read heartbeats" ON public.system_heartbeats
FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages heartbeats" ON public.system_heartbeats
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_heartbeat(
  _service_name text, _service_kind text, _status text,
  _latency_ms integer DEFAULT NULL, _detail jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.system_heartbeats(service_name, service_kind, status, latency_ms, detail)
  VALUES (_service_name, _service_kind, _status, _latency_ms, COALESCE(_detail,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.record_heartbeat(text,text,text,integer,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_heartbeat(text,text,text,integer,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_latest_heartbeats(_within_minutes integer DEFAULT 15)
RETURNS TABLE(service_name text, service_kind text, status text, latency_ms integer,
              detail jsonb, observed_at timestamptz, is_stale boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT DISTINCT ON (h.service_name)
    h.service_name, h.service_kind, h.status, h.latency_ms, h.detail, h.observed_at,
    (h.observed_at < now() - make_interval(mins => _within_minutes))
  FROM public.system_heartbeats h
  ORDER BY h.service_name, h.observed_at DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_latest_heartbeats(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_old_heartbeats(_days integer DEFAULT 7)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  DELETE FROM public.system_heartbeats WHERE observed_at < now() - make_interval(days => _days);
  GET DIAGNOSTICS _n = ROW_COUNT; RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_old_heartbeats(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_heartbeats(integer) TO service_role;

-- =================== Edge Performance Metrics ===================
CREATE TABLE public.edge_function_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status_code integer NOT NULL,
  duration_ms integer NOT NULL,
  error_code text,
  bucket_minute timestamptz NOT NULL DEFAULT date_trunc('minute', now()),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_edge_metrics_fn_time ON public.edge_function_metrics (function_name, bucket_minute DESC);
CREATE INDEX idx_edge_metrics_bucket ON public.edge_function_metrics (bucket_minute DESC);

GRANT SELECT ON public.edge_function_metrics TO authenticated;
GRANT ALL ON public.edge_function_metrics TO service_role;
ALTER TABLE public.edge_function_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read edge metrics" ON public.edge_function_metrics
FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages edge metrics" ON public.edge_function_metrics
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_edge_metric(
  _function_name text, _status_code integer, _duration_ms integer, _error_code text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.edge_function_metrics(function_name, status_code, duration_ms, error_code)
  VALUES (_function_name, _status_code, _duration_ms, _error_code);
END $$;
REVOKE ALL ON FUNCTION public.record_edge_metric(text,integer,integer,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_edge_metric(text,integer,integer,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_edge_metrics_summary(_hours integer DEFAULT 1)
RETURNS TABLE(function_name text, invocations bigint, errors bigint, error_rate numeric,
              p50_ms numeric, p95_ms numeric, p99_ms numeric, avg_ms numeric,
              max_ms integer, last_seen timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT m.function_name,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE m.status_code >= 500)::bigint,
    ROUND((COUNT(*) FILTER (WHERE m.status_code >= 500))::numeric / NULLIF(COUNT(*),0)::numeric * 100, 2),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY m.duration_ms)::numeric,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY m.duration_ms)::numeric,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY m.duration_ms)::numeric,
    ROUND(AVG(m.duration_ms)::numeric, 2),
    MAX(m.duration_ms),
    MAX(m.created_at)
  FROM public.edge_function_metrics m
  WHERE m.bucket_minute >= now() - make_interval(hours => _hours)
  GROUP BY m.function_name
  ORDER BY 2 DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_edge_metrics_summary(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_edge_metrics_trend(_function_name text, _hours integer DEFAULT 6)
RETURNS TABLE(bucket timestamptz, invocations bigint, errors bigint, p95_ms numeric, avg_ms numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT m.bucket_minute,
         COUNT(*)::bigint,
         COUNT(*) FILTER (WHERE m.status_code >= 500)::bigint,
         percentile_cont(0.95) WITHIN GROUP (ORDER BY m.duration_ms)::numeric,
         ROUND(AVG(m.duration_ms)::numeric,2)
  FROM public.edge_function_metrics m
  WHERE m.function_name = _function_name
    AND m.bucket_minute >= now() - make_interval(hours => _hours)
  GROUP BY m.bucket_minute
  ORDER BY m.bucket_minute ASC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_edge_metrics_trend(text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_old_edge_metrics(_days integer DEFAULT 14)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  DELETE FROM public.edge_function_metrics WHERE created_at < now() - make_interval(days => _days);
  GET DIAGNOSTICS _n = ROW_COUNT; RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_old_edge_metrics(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_edge_metrics(integer) TO service_role;
