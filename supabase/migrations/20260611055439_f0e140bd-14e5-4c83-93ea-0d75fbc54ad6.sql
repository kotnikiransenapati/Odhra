
-- ============================================================
-- BATCH 53: Secret Rotation Scheduler
-- ============================================================
CREATE TABLE IF NOT EXISTS public.secret_rotation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name text NOT NULL UNIQUE,
  description text,
  rotation_interval_days integer NOT NULL DEFAULT 90 CHECK (rotation_interval_days > 0),
  last_rotated_at timestamptz,
  next_due_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  owner_email text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.secret_rotation_schedules TO authenticated;
GRANT ALL ON public.secret_rotation_schedules TO service_role;

ALTER TABLE public.secret_rotation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rotation schedules"
ON public.secret_rotation_schedules
FOR ALL TO authenticated
USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE INDEX IF NOT EXISTS idx_secret_rotation_due ON public.secret_rotation_schedules(next_due_at) WHERE is_active = true;

CREATE TRIGGER trg_secret_rotation_schedules_updated_at
BEFORE UPDATE ON public.secret_rotation_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPCs
CREATE OR REPLACE FUNCTION public.admin_secret_rotation_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE is_active),
    'overdue', COUNT(*) FILTER (WHERE is_active AND next_due_at < now()),
    'due_soon', COUNT(*) FILTER (WHERE is_active AND next_due_at BETWEEN now() AND now() + interval '14 days'),
    'critical', COUNT(*) FILTER (WHERE severity = 'critical' AND is_active)
  ) INTO result FROM public.secret_rotation_schedules;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_secret_rotation_list()
RETURNS SETOF public.secret_rotation_schedules
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT * FROM public.secret_rotation_schedules
    ORDER BY (next_due_at < now()) DESC, next_due_at ASC LIMIT 500;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_secret_rotation(
  _secret_name text,
  _description text,
  _interval_days integer,
  _owner_email text,
  _severity text,
  _is_active boolean,
  _notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.secret_rotation_schedules
    (secret_name, description, rotation_interval_days, owner_email, severity, is_active, notes,
     next_due_at)
  VALUES (_secret_name, _description, COALESCE(_interval_days,90), _owner_email,
          COALESCE(_severity,'medium'), COALESCE(_is_active,true), _notes,
          now() + (COALESCE(_interval_days,90) || ' days')::interval)
  ON CONFLICT (secret_name) DO UPDATE SET
    description = EXCLUDED.description,
    rotation_interval_days = EXCLUDED.rotation_interval_days,
    owner_email = EXCLUDED.owner_email,
    severity = EXCLUDED.severity,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now()
  RETURNING id INTO _id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'upsert', 'secret_rotation_schedule', _id::text,
          jsonb_build_object('secret_name', _secret_name));
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_secret_rotated(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _interval integer; _name text;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT rotation_interval_days, secret_name INTO _interval, _name
    FROM public.secret_rotation_schedules WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;

  UPDATE public.secret_rotation_schedules
  SET last_rotated_at = now(),
      next_due_at = now() + (_interval || ' days')::interval,
      updated_at = now()
  WHERE id = _id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'rotate', 'secret_rotation_schedule', _id::text,
          jsonb_build_object('secret_name', _name));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_secret_rotation_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_secret_rotation_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_secret_rotation(text,text,integer,text,text,boolean,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_mark_secret_rotated(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_secret_rotation_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_secret_rotation_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_secret_rotation(text,text,integer,text,text,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_secret_rotated(uuid) TO authenticated;

-- ============================================================
-- BATCH 54: API Key Usage Analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_key_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  status_code integer NOT NULL,
  latency_ms integer,
  ip_address inet,
  user_agent text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.api_key_usage_events TO authenticated;
GRANT ALL ON public.api_key_usage_events TO service_role;

ALTER TABLE public.api_key_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read api key usage"
ON public.api_key_usage_events
FOR SELECT TO authenticated
USING (public.admin_has_permission(auth.uid(), 'view_error_monitoring'));

CREATE POLICY "Service inserts api key usage"
ON public.api_key_usage_events
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_created ON public.api_key_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON public.api_key_usage_events(api_key_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_api_key_usage_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT jsonb_build_object(
    'total_24h', COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours'),
    'errors_24h', COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours' AND status_code >= 400),
    'unique_keys_24h', COUNT(DISTINCT api_key_id) FILTER (WHERE created_at > now() - interval '24 hours'),
    'avg_latency_ms', COALESCE(ROUND(AVG(latency_ms) FILTER (WHERE created_at > now() - interval '24 hours'))::int, 0),
    'p95_latency_ms', COALESCE((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)
                                FILTER (WHERE created_at > now() - interval '24 hours'))::int, 0)
  ) INTO result FROM public.api_key_usage_events;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_api_key_usage_recent(_limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid, api_key_id uuid, endpoint text, method text, status_code integer,
  latency_ms integer, ip_address inet, error_message text, created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT e.id, e.api_key_id, e.endpoint, e.method, e.status_code,
    e.latency_ms, e.ip_address, e.error_message, e.created_at
  FROM public.api_key_usage_events e
  ORDER BY e.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 100), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_api_key_usage_by_endpoint()
RETURNS TABLE(endpoint text, calls bigint, errors bigint, avg_latency numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT e.endpoint, COUNT(*)::bigint AS calls,
    COUNT(*) FILTER (WHERE e.status_code >= 400)::bigint AS errors,
    ROUND(AVG(e.latency_ms)::numeric, 1) AS avg_latency
  FROM public.api_key_usage_events e
  WHERE e.created_at > now() - interval '24 hours'
  GROUP BY e.endpoint
  ORDER BY calls DESC
  LIMIT 25;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_api_key_usage_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_api_key_usage_recent(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_api_key_usage_by_endpoint() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_api_key_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_api_key_usage_recent(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_api_key_usage_by_endpoint() TO authenticated;
