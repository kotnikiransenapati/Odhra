
-- Phase B: Observability & Reliability

-- 1. SLO definitions
CREATE TABLE public.slo_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  target_type text NOT NULL CHECK (target_type IN ('latency_ms','error_rate','availability')),
  target_value numeric NOT NULL,
  window_minutes int NOT NULL DEFAULT 60,
  scope text NOT NULL DEFAULT 'edge_function',
  scope_ref text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.slo_definitions TO authenticated;
GRANT ALL ON public.slo_definitions TO service_role;
ALTER TABLE public.slo_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage SLOs" ON public.slo_definitions FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins view SLOs" ON public.slo_definitions FOR SELECT USING (is_admin(auth.uid()));

-- 2. Edge function latency / observability metric
CREATE TABLE public.edge_function_metrics (
  id bigserial PRIMARY KEY,
  function_name text NOT NULL,
  duration_ms int NOT NULL,
  status_code int,
  error boolean NOT NULL DEFAULT false,
  error_message text,
  request_id text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_edge_fn_metrics_fn_time ON public.edge_function_metrics(function_name, created_at DESC);
CREATE INDEX idx_edge_fn_metrics_time ON public.edge_function_metrics(created_at DESC);
GRANT INSERT ON public.edge_function_metrics TO authenticated, anon;
GRANT SELECT ON public.edge_function_metrics TO authenticated;
GRANT ALL ON public.edge_function_metrics TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.edge_function_metrics_id_seq TO authenticated, anon, service_role;
ALTER TABLE public.edge_function_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone insert metrics" ON public.edge_function_metrics FOR INSERT WITH CHECK (duration_ms >= 0 AND length(function_name) BETWEEN 1 AND 200);
CREATE POLICY "Admins view metrics" ON public.edge_function_metrics FOR SELECT USING (is_admin(auth.uid()));

-- 3. Dead-letter queue for failed background jobs
CREATE TABLE public.dead_letter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text NOT NULL,
  attempts int NOT NULL DEFAULT 1,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  next_retry_at timestamptz,
  status text NOT NULL DEFAULT 'failed' CHECK (status IN ('failed','retrying','resolved','abandoned')),
  source text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dlq_status_time ON public.dead_letter_queue(status, created_at DESC);
GRANT SELECT, UPDATE ON public.dead_letter_queue TO authenticated;
GRANT ALL ON public.dead_letter_queue TO service_role;
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage DLQ" ON public.dead_letter_queue FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 4. SLO rollup view (last hour per function)
CREATE OR REPLACE VIEW public.edge_function_slo_rollup AS
SELECT
  function_name,
  count(*) AS calls,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_ms,
  sum(CASE WHEN error THEN 1 ELSE 0 END)::float / NULLIF(count(*),0) AS error_rate,
  max(created_at) AS last_seen
FROM public.edge_function_metrics
WHERE created_at > now() - interval '1 hour'
GROUP BY function_name;
GRANT SELECT ON public.edge_function_slo_rollup TO authenticated;

-- 5. Updated_at trigger
CREATE TRIGGER trg_slo_definitions_updated_at
  BEFORE UPDATE ON public.slo_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Analytics events retention helper (compact rather than partition for simplicity)
CREATE OR REPLACE FUNCTION public.prune_analytics_events(retention_days int DEFAULT 90)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted int;
BEGIN
  DELETE FROM public.analytics_events WHERE created_at < now() - (retention_days || ' days')::interval;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END $$;
REVOKE ALL ON FUNCTION public.prune_analytics_events(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_analytics_events(int) TO service_role;
