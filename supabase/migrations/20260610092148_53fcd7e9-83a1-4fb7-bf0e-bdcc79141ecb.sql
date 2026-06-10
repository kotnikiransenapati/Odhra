
-- ============================================================================
-- Phase G Batch 7: DLQ Replay tools
-- Phase G Batch 8: Audit Log structured query API
-- ============================================================================

-- Helper: is the caller an active admin?
CREATE OR REPLACE FUNCTION public._caller_is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
      AND is_active = true
      AND (access_expires_at IS NULL OR access_expires_at > now())
  );
$$;
REVOKE ALL ON FUNCTION public._caller_is_active_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._caller_is_active_admin() TO authenticated, service_role;

-- ---------- DLQ admin list ----------
CREATE OR REPLACE FUNCTION public.admin_dlq_list(
  _status text DEFAULT NULL,
  _job_type text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid, job_type text, source text, status text,
  attempts int, error_message text, payload jsonb,
  last_attempt_at timestamptz, next_retry_at timestamptz,
  resolved_at timestamptz, resolved_by uuid, created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT * FROM public.dead_letter_queue d
    WHERE (_status IS NULL OR d.status = _status)
      AND (_job_type IS NULL OR d.job_type = _job_type)
  ),
  counted AS (SELECT count(*)::bigint AS c FROM filtered)
  SELECT f.id, f.job_type, f.source, f.status,
         f.attempts, f.error_message, f.payload,
         f.last_attempt_at, f.next_retry_at,
         f.resolved_at, f.resolved_by, f.created_at,
         (SELECT c FROM counted) AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT GREATEST(_limit, 1) OFFSET GREATEST(_offset, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_dlq_list(text, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dlq_list(text, text, int, int) TO authenticated, service_role;

-- ---------- DLQ replay (re-enqueue) ----------
CREATE OR REPLACE FUNCTION public.admin_dlq_replay(_id uuid)
RETURNS public.dead_letter_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.dead_letter_queue;
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.dead_letter_queue
     SET status = 'pending',
         next_retry_at = now(),
         resolved_at = NULL,
         resolved_by = NULL
   WHERE id = _id
  RETURNING * INTO r;

  IF r.id IS NULL THEN
    RAISE EXCEPTION 'dlq entry % not found', _id USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'dlq.replay', 'dead_letter_queue', _id::text,
          jsonb_build_object('job_type', r.job_type, 'source', r.source));

  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_dlq_replay(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dlq_replay(uuid) TO authenticated, service_role;

-- ---------- DLQ discard ----------
CREATE OR REPLACE FUNCTION public.admin_dlq_discard(_id uuid, _reason text DEFAULT NULL)
RETURNS public.dead_letter_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.dead_letter_queue;
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.dead_letter_queue
     SET status = 'discarded',
         resolved_at = now(),
         resolved_by = auth.uid()
   WHERE id = _id
  RETURNING * INTO r;

  IF r.id IS NULL THEN
    RAISE EXCEPTION 'dlq entry % not found', _id USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'dlq.discard', 'dead_letter_queue', _id::text,
          jsonb_build_object('reason', _reason, 'job_type', r.job_type));

  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_dlq_discard(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dlq_discard(uuid, text) TO authenticated, service_role;

-- ---------- Audit log structured query ----------
CREATE OR REPLACE FUNCTION public.admin_audit_query(
  _admin_id uuid DEFAULT NULL,
  _action text DEFAULT NULL,
  _entity_type text DEFAULT NULL,
  _entity_id text DEFAULT NULL,
  _search text DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid, admin_id uuid, action text, entity_type text, entity_id text,
  old_values jsonb, new_values jsonb, ip_address text, user_agent text,
  created_at timestamptz, total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT a.* FROM public.audit_logs a
    WHERE (_admin_id IS NULL OR a.admin_id = _admin_id)
      AND (_action IS NULL OR a.action ILIKE '%' || _action || '%')
      AND (_entity_type IS NULL OR a.entity_type = _entity_type)
      AND (_entity_id IS NULL OR a.entity_id = _entity_id)
      AND (_from IS NULL OR a.created_at >= _from)
      AND (_to IS NULL OR a.created_at <= _to)
      AND (
        _search IS NULL
        OR a.action ILIKE '%' || _search || '%'
        OR a.entity_type ILIKE '%' || _search || '%'
        OR a.entity_id ILIKE '%' || _search || '%'
        OR a.new_values::text ILIKE '%' || _search || '%'
        OR a.old_values::text ILIKE '%' || _search || '%'
      )
  ),
  counted AS (SELECT count(*)::bigint AS c FROM filtered)
  SELECT f.id, f.admin_id, f.action, f.entity_type, f.entity_id,
         f.old_values, f.new_values, f.ip_address, f.user_agent,
         f.created_at, (SELECT c FROM counted)
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT GREATEST(_limit, 1) OFFSET GREATEST(_offset, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_audit_query(uuid, text, text, text, text, timestamptz, timestamptz, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_audit_query(uuid, text, text, text, text, timestamptz, timestamptz, int, int) TO authenticated, service_role;

-- Supporting indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_desc ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dlq_status_created ON public.dead_letter_queue (status, created_at DESC);
