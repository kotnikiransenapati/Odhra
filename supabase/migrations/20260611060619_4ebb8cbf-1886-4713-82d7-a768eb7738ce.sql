
-- ============================================================
-- BATCH 57: Admin Notification Preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_in_app boolean NOT NULL DEFAULT true,
  channel_email boolean NOT NULL DEFAULT true,
  channel_sms boolean NOT NULL DEFAULT false,
  severity_threshold text NOT NULL DEFAULT 'medium' CHECK (severity_threshold IN ('low','medium','high','critical')),
  categories text[] NOT NULL DEFAULT ARRAY['security','orders','inventory','payments']::text[],
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notification_preferences TO authenticated;
GRANT ALL ON public.admin_notification_preferences TO service_role;

ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own preferences"
ON public.admin_notification_preferences
FOR ALL TO authenticated
USING (admin_user_id = auth.uid() OR public.admin_has_permission(auth.uid(), 'manage_admins'))
WITH CHECK (admin_user_id = auth.uid() OR public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE TRIGGER trg_admin_notif_prefs_updated_at
BEFORE UPDATE ON public.admin_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_my_admin_notification_prefs()
RETURNS public.admin_notification_preferences
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.admin_notification_preferences;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO result FROM public.admin_notification_preferences WHERE admin_user_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO public.admin_notification_preferences (admin_user_id) VALUES (auth.uid())
    RETURNING * INTO result;
  END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_my_admin_notification_prefs(
  _channel_in_app boolean, _channel_email boolean, _channel_sms boolean,
  _severity_threshold text, _categories text[],
  _quiet_hours_start time, _quiet_hours_end time, _timezone text, _is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.admin_notification_preferences
    (admin_user_id, channel_in_app, channel_email, channel_sms,
     severity_threshold, categories, quiet_hours_start, quiet_hours_end, timezone, is_active)
  VALUES (auth.uid(),
    COALESCE(_channel_in_app, true), COALESCE(_channel_email, true), COALESCE(_channel_sms, false),
    COALESCE(_severity_threshold, 'medium'), COALESCE(_categories, ARRAY['security','orders']::text[]),
    _quiet_hours_start, _quiet_hours_end, COALESCE(_timezone, 'Asia/Kolkata'), COALESCE(_is_active, true))
  ON CONFLICT (admin_user_id) DO UPDATE SET
    channel_in_app = EXCLUDED.channel_in_app,
    channel_email = EXCLUDED.channel_email,
    channel_sms = EXCLUDED.channel_sms,
    severity_threshold = EXCLUDED.severity_threshold,
    categories = EXCLUDED.categories,
    quiet_hours_start = EXCLUDED.quiet_hours_start,
    quiet_hours_end = EXCLUDED.quiet_hours_end,
    timezone = EXCLUDED.timezone,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_admin_notification_prefs() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_my_admin_notification_prefs(boolean,boolean,boolean,text,text[],time,time,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admin_notification_prefs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_admin_notification_prefs(boolean,boolean,boolean,text,text[],time,time,text,boolean) TO authenticated;

-- ============================================================
-- BATCH 58: Service Health Probes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_health_probes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  url text NOT NULL,
  method text NOT NULL DEFAULT 'GET' CHECK (method IN ('GET','POST','HEAD')),
  expected_status integer NOT NULL DEFAULT 200,
  timeout_ms integer NOT NULL DEFAULT 5000 CHECK (timeout_ms BETWEEN 100 AND 60000),
  interval_seconds integer NOT NULL DEFAULT 300 CHECK (interval_seconds >= 30),
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text CHECK (last_status IN ('ok','degraded','down')),
  last_latency_ms integer,
  consecutive_failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_health_probes TO authenticated;
GRANT ALL ON public.service_health_probes TO service_role;

ALTER TABLE public.service_health_probes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage probes"
ON public.service_health_probes
FOR ALL TO authenticated
USING (public.admin_has_permission(auth.uid(), 'view_error_monitoring'))
WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE TRIGGER trg_service_health_probes_updated_at
BEFORE UPDATE ON public.service_health_probes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.service_health_probe_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  probe_id uuid NOT NULL REFERENCES public.service_health_probes(id) ON DELETE CASCADE,
  status_code integer,
  latency_ms integer,
  success boolean NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.service_health_probe_results TO authenticated;
GRANT ALL ON public.service_health_probe_results TO service_role;

ALTER TABLE public.service_health_probe_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read probe results"
ON public.service_health_probe_results
FOR SELECT TO authenticated
USING (public.admin_has_permission(auth.uid(), 'view_error_monitoring'));

CREATE POLICY "Admins insert probe results"
ON public.service_health_probe_results
FOR INSERT TO authenticated
WITH CHECK (public.admin_has_permission(auth.uid(), 'view_error_monitoring'));

CREATE INDEX IF NOT EXISTS idx_probe_results_probe_time ON public.service_health_probe_results(probe_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_probes_stats()
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
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE is_active),
    'ok', COUNT(*) FILTER (WHERE last_status = 'ok'),
    'degraded', COUNT(*) FILTER (WHERE last_status = 'degraded'),
    'down', COUNT(*) FILTER (WHERE last_status = 'down')
  ) INTO result FROM public.service_health_probes;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_probes_list()
RETURNS SETOF public.service_health_probes
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT * FROM public.service_health_probes
    ORDER BY (last_status = 'down') DESC, (last_status = 'degraded') DESC, name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_probe(
  _name text, _description text, _url text, _method text,
  _expected_status integer, _timeout_ms integer, _interval_seconds integer, _is_active boolean
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
  INSERT INTO public.service_health_probes
    (name, description, url, method, expected_status, timeout_ms, interval_seconds, is_active)
  VALUES (_name, _description, _url, COALESCE(_method, 'GET'),
    COALESCE(_expected_status, 200), COALESCE(_timeout_ms, 5000),
    COALESCE(_interval_seconds, 300), COALESCE(_is_active, true))
  ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description, url = EXCLUDED.url, method = EXCLUDED.method,
    expected_status = EXCLUDED.expected_status, timeout_ms = EXCLUDED.timeout_ms,
    interval_seconds = EXCLUDED.interval_seconds, is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING id INTO _id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'upsert', 'service_health_probe', _id::text, jsonb_build_object('name', _name));
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_probe(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  DELETE FROM public.service_health_probes WHERE id = _id;
  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, resource_id)
  VALUES (auth.uid(), 'delete', 'service_health_probe', _id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_record_probe_result(
  _probe_id uuid, _status_code integer, _latency_ms integer,
  _success boolean, _error_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid; _new_status text;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.service_health_probe_results
    (probe_id, status_code, latency_ms, success, error_message)
  VALUES (_probe_id, _status_code, _latency_ms, _success, _error_message)
  RETURNING id INTO _id;

  _new_status := CASE
    WHEN _success AND COALESCE(_latency_ms, 0) > 3000 THEN 'degraded'
    WHEN _success THEN 'ok'
    ELSE 'down'
  END;

  UPDATE public.service_health_probes
  SET last_run_at = now(),
      last_status = _new_status,
      last_latency_ms = _latency_ms,
      consecutive_failures = CASE WHEN _success THEN 0 ELSE consecutive_failures + 1 END,
      updated_at = now()
  WHERE id = _probe_id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_probes_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_probes_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_probe(text,text,text,text,integer,integer,integer,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_probe(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_record_probe_result(uuid,integer,integer,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_probes_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_probes_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_probe(text,text,text,text,integer,integer,integer,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_probe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_probe_result(uuid,integer,integer,boolean,text) TO authenticated;
