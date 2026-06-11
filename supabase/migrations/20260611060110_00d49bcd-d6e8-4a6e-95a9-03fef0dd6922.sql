
-- ============================================================
-- BATCH 55: Data Export Job Queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.data_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type text NOT NULL,
  format text NOT NULL DEFAULT 'csv' CHECK (format IN ('csv','json','xlsx')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  row_count integer,
  file_url text,
  file_size_bytes bigint,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_export_jobs TO authenticated;
GRANT ALL ON public.data_export_jobs TO service_role;

ALTER TABLE public.data_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage export jobs"
ON public.data_export_jobs
FOR ALL TO authenticated
USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE INDEX IF NOT EXISTS idx_data_export_jobs_status ON public.data_export_jobs(status, created_at DESC);

CREATE TRIGGER trg_data_export_jobs_updated_at
BEFORE UPDATE ON public.data_export_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_export_jobs_stats()
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
    'queued', COUNT(*) FILTER (WHERE status = 'queued'),
    'running', COUNT(*) FILTER (WHERE status = 'running'),
    'completed_24h', COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > now() - interval '24 hours'),
    'failed_24h', COUNT(*) FILTER (WHERE status = 'failed' AND created_at > now() - interval '24 hours')
  ) INTO result FROM public.data_export_jobs;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_export_jobs_list(_limit integer DEFAULT 100)
RETURNS SETOF public.data_export_jobs
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT * FROM public.data_export_jobs
    ORDER BY created_at DESC LIMIT LEAST(COALESCE(_limit, 100), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_export_job(
  _resource_type text, _format text, _filters jsonb
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
  INSERT INTO public.data_export_jobs (requested_by, resource_type, format, filters)
  VALUES (auth.uid(), _resource_type, COALESCE(_format, 'csv'), COALESCE(_filters, '{}'::jsonb))
  RETURNING id INTO _id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'create', 'data_export_job', _id::text,
          jsonb_build_object('resource', _resource_type, 'format', _format));
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_export_job(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  UPDATE public.data_export_jobs
  SET status = 'cancelled', completed_at = now(), updated_at = now()
  WHERE id = _id AND status IN ('queued','running');

  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, resource_id)
  VALUES (auth.uid(), 'cancel', 'data_export_job', _id::text);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_export_jobs_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_export_jobs_list(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_export_job(text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cancel_export_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_export_jobs_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_export_jobs_list(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_export_job(text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_export_job(uuid) TO authenticated;

-- ============================================================
-- BATCH 56: Backup Verification Log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.backup_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES public.backup_snapshots(id) ON DELETE SET NULL,
  snapshot_label text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','passed','failed')),
  verified_rows bigint,
  duration_ms integer,
  error_message text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_verifications TO authenticated;
GRANT ALL ON public.backup_verifications TO service_role;

ALTER TABLE public.backup_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage backup verifications"
ON public.backup_verifications
FOR ALL TO authenticated
USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE INDEX IF NOT EXISTS idx_backup_verifications_status ON public.backup_verifications(status, created_at DESC);

CREATE TRIGGER trg_backup_verifications_updated_at
BEFORE UPDATE ON public.backup_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_backup_verifications_stats()
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
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'passed_7d', COUNT(*) FILTER (WHERE status = 'passed' AND completed_at > now() - interval '7 days'),
    'failed_7d', COUNT(*) FILTER (WHERE status = 'failed' AND completed_at > now() - interval '7 days'),
    'last_passed_at', MAX(completed_at) FILTER (WHERE status = 'passed')
  ) INTO result FROM public.backup_verifications;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_backup_verifications_list(_limit integer DEFAULT 100)
RETURNS SETOF public.backup_verifications
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT * FROM public.backup_verifications
    ORDER BY created_at DESC LIMIT LEAST(COALESCE(_limit, 100), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_record_backup_verification(
  _snapshot_id uuid, _snapshot_label text, _status text,
  _verified_rows bigint, _duration_ms integer, _error_message text, _notes text
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
  IF _status NOT IN ('pending','running','passed','failed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  INSERT INTO public.backup_verifications
    (snapshot_id, snapshot_label, status, verified_rows, duration_ms,
     error_message, notes, verified_by,
     started_at, completed_at)
  VALUES (_snapshot_id, _snapshot_label, _status, _verified_rows, _duration_ms,
          _error_message, _notes, auth.uid(),
          CASE WHEN _status IN ('running','passed','failed') THEN now() END,
          CASE WHEN _status IN ('passed','failed') THEN now() END)
  RETURNING id INTO _id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'verify', 'backup_snapshot', COALESCE(_snapshot_id::text, _id::text),
          jsonb_build_object('status', _status, 'label', _snapshot_label));
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_backup_verifications_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_backup_verifications_list(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_record_backup_verification(uuid,text,text,bigint,integer,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_backup_verifications_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_backup_verifications_list(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_backup_verification(uuid,text,text,bigint,integer,text,text) TO authenticated;
