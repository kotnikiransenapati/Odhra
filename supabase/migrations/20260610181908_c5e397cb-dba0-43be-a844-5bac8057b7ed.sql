-- Batch 33: Backup Snapshots Registry
CREATE TABLE IF NOT EXISTS public.backup_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  snapshot_type text NOT NULL DEFAULT 'logical' CHECK (snapshot_type IN ('logical','schema','data','full')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','restored','expired')),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  size_bytes bigint,
  checksum text,
  storage_path text,
  notes text,
  triggered_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  restored_at timestamptz,
  restored_by uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.backup_snapshots TO authenticated;
GRANT ALL ON public.backup_snapshots TO service_role;
ALTER TABLE public.backup_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read backup snapshots" ON public.backup_snapshots FOR SELECT TO authenticated
USING (public.admin_has_permission(auth.uid(), 'manage_admins'));
CREATE POLICY "Service role manages backup snapshots" ON public.backup_snapshots FOR ALL TO service_role
USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_status ON public.backup_snapshots(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_expires ON public.backup_snapshots(expires_at) WHERE expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_register_backup_snapshot(
  _label text, _snapshot_type text DEFAULT 'logical', _scope jsonb DEFAULT '{}'::jsonb,
  _retention_days int DEFAULT 30, _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'insufficient_permissions'; END IF;
  INSERT INTO public.backup_snapshots(label, snapshot_type, scope, notes, triggered_by, status, started_at, expires_at)
  VALUES (_label, COALESCE(_snapshot_type,'logical'), COALESCE(_scope,'{}'::jsonb), _notes, auth.uid(), 'pending', now(),
          now() + make_interval(days => COALESCE(_retention_days,30)))
  RETURNING id INTO v_id;
  INSERT INTO public.audit_logs(admin_id, action, resource_type, resource_id, new_values)
  VALUES (auth.uid(), 'backup.snapshot.register', 'backup_snapshots', v_id::text,
          jsonb_build_object('label',_label,'type',_snapshot_type,'retention_days',_retention_days));
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_register_backup_snapshot(text, text, jsonb, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_register_backup_snapshot(text, text, jsonb, int, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_mark_backup_restored(_snapshot_id uuid, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'insufficient_permissions'; END IF;
  UPDATE public.backup_snapshots SET status='restored', restored_at=now(), restored_by=auth.uid(), notes=COALESCE(_notes,notes)
  WHERE id = _snapshot_id;
  INSERT INTO public.audit_logs(admin_id, action, resource_type, resource_id, new_values)
  VALUES (auth.uid(), 'backup.snapshot.restored', 'backup_snapshots', _snapshot_id::text, jsonb_build_object('notes',_notes));
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_mark_backup_restored(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_backup_restored(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_expire_backup_snapshots()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int := 0;
BEGIN
  UPDATE public.backup_snapshots SET status='expired'
  WHERE expires_at IS NOT NULL AND expires_at < now() AND status NOT IN ('expired','restored');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_expire_backup_snapshots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_expire_backup_snapshots() TO service_role;

-- Batch 34: API Rate Limit Policies
CREATE TABLE IF NOT EXISTS public.api_rate_limit_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global','endpoint','user','ip','vendor')),
  endpoint_pattern text,
  window_seconds int NOT NULL DEFAULT 60 CHECK (window_seconds > 0),
  max_requests int NOT NULL DEFAULT 60 CHECK (max_requests > 0),
  burst_multiplier numeric(4,2) NOT NULL DEFAULT 1.5 CHECK (burst_multiplier >= 1.0),
  action text NOT NULL DEFAULT 'throttle' CHECK (action IN ('throttle','block','log_only')),
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_rate_limit_policies TO authenticated;
GRANT ALL ON public.api_rate_limit_policies TO service_role;
ALTER TABLE public.api_rate_limit_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rate policies" ON public.api_rate_limit_policies FOR SELECT TO authenticated
USING (public.admin_has_permission(auth.uid(), 'manage_admins'));
CREATE POLICY "Service role manages rate policies" ON public.api_rate_limit_policies FOR ALL TO service_role
USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_api_rate_policies_active ON public.api_rate_limit_policies(is_active, scope);

CREATE OR REPLACE FUNCTION public.touch_api_rate_limit_policies()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_touch_api_rate_limit_policies ON public.api_rate_limit_policies;
CREATE TRIGGER trg_touch_api_rate_limit_policies BEFORE UPDATE ON public.api_rate_limit_policies
FOR EACH ROW EXECUTE FUNCTION public.touch_api_rate_limit_policies();

CREATE OR REPLACE FUNCTION public.admin_upsert_rate_limit_policy(
  _id uuid, _name text, _scope text, _endpoint_pattern text, _window_seconds int,
  _max_requests int, _burst_multiplier numeric, _action text, _is_active boolean, _description text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'insufficient_permissions'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.api_rate_limit_policies(name, scope, endpoint_pattern, window_seconds, max_requests,
      burst_multiplier, action, is_active, description, created_by, updated_by)
    VALUES (_name, _scope, _endpoint_pattern, _window_seconds, _max_requests,
      COALESCE(_burst_multiplier,1.5), COALESCE(_action,'throttle'), COALESCE(_is_active,true), _description, auth.uid(), auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.api_rate_limit_policies
    SET name=_name, scope=_scope, endpoint_pattern=_endpoint_pattern, window_seconds=_window_seconds,
        max_requests=_max_requests, burst_multiplier=COALESCE(_burst_multiplier,burst_multiplier),
        action=COALESCE(_action,action), is_active=COALESCE(_is_active,is_active), description=_description, updated_by=auth.uid()
    WHERE id = _id RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_logs(admin_id, action, resource_type, resource_id, new_values)
  VALUES (auth.uid(), 'rate_limit.policy.upsert', 'api_rate_limit_policies', v_id::text,
          jsonb_build_object('name',_name,'scope',_scope,'max_requests',_max_requests,'window_seconds',_window_seconds));
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_rate_limit_policy(uuid, text, text, text, int, int, numeric, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_rate_limit_policy(uuid, text, text, text, int, int, numeric, text, boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_toggle_rate_limit_policy(_id uuid, _is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'insufficient_permissions'; END IF;
  UPDATE public.api_rate_limit_policies SET is_active=_is_active, updated_by=auth.uid() WHERE id = _id;
  INSERT INTO public.audit_logs(admin_id, action, resource_type, resource_id, new_values)
  VALUES (auth.uid(), 'rate_limit.policy.toggle', 'api_rate_limit_policies', _id::text, jsonb_build_object('is_active',_is_active));
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_rate_limit_policy(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_toggle_rate_limit_policy(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_rate_limit_policy(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'insufficient_permissions'; END IF;
  DELETE FROM public.api_rate_limit_policies WHERE id = _id;
  INSERT INTO public.audit_logs(admin_id, action, resource_type, resource_id, new_values)
  VALUES (auth.uid(), 'rate_limit.policy.delete', 'api_rate_limit_policies', _id::text, '{}'::jsonb);
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_delete_rate_limit_policy(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_rate_limit_policy(uuid) TO authenticated, service_role;