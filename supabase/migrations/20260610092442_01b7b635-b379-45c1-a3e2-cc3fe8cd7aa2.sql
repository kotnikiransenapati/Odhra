
-- Admin-only view of pg_cron schedules + recent runs
CREATE OR REPLACE FUNCTION public.admin_cron_status(_runs_per_job int DEFAULT 10)
RETURNS TABLE(
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  active boolean,
  last_run_started_at timestamptz,
  last_status text,
  last_duration_ms numeric,
  last_return_message text,
  recent_runs jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      r.jobid,
      r.start_time,
      r.end_time,
      r.status,
      r.return_message,
      EXTRACT(EPOCH FROM (COALESCE(r.end_time, now()) - r.start_time)) * 1000 AS duration_ms,
      ROW_NUMBER() OVER (PARTITION BY r.jobid ORDER BY r.start_time DESC) AS rn
    FROM cron.job_run_details r
  ),
  recent AS (
    SELECT jobid, jsonb_agg(jsonb_build_object(
      'started_at', start_time,
      'ended_at', end_time,
      'status', status,
      'duration_ms', duration_ms,
      'message', LEFT(COALESCE(return_message, ''), 500)
    ) ORDER BY start_time DESC) AS runs
    FROM ranked
    WHERE rn <= GREATEST(_runs_per_job, 1)
    GROUP BY jobid
  ),
  latest AS (
    SELECT DISTINCT ON (jobid) jobid, start_time, status, duration_ms, return_message
    FROM ranked
    ORDER BY jobid, start_time DESC
  )
  SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    LEFT(j.command, 800),
    j.active,
    l.start_time,
    l.status,
    l.duration_ms,
    LEFT(COALESCE(l.return_message, ''), 500),
    COALESCE(rc.runs, '[]'::jsonb)
  FROM cron.job j
  LEFT JOIN latest l USING (jobid)
  LEFT JOIN recent rc USING (jobid)
  ORDER BY j.jobname;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cron_status(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cron_status(int) TO authenticated, service_role;
