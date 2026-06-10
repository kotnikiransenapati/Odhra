-- Phase G Batches 29 + 30: Scheduled Feature Rollouts and Customer Broadcast Orchestration

-- Compatibility repairs for prior admin functions that used non-existent audit columns.
CREATE OR REPLACE FUNCTION public.admin_create_incident(
  _title text,
  _severity text,
  _impact text,
  _public_summary text,
  _affected_services text[],
  _is_public boolean DEFAULT true,
  _source_alert_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF coalesce(length(trim(_title)),0) < 3 THEN
    RAISE EXCEPTION 'title too short';
  END IF;

  INSERT INTO public.incidents(title,severity,impact,public_summary,affected_services,is_public,created_by,source_alert_id)
  VALUES(trim(_title),_severity,coalesce(_impact,''),coalesce(_public_summary,''),coalesce(_affected_services,'{}'::text[]),_is_public,auth.uid(),_source_alert_id)
  RETURNING id INTO _id;

  INSERT INTO public.incident_updates(incident_id,status,message,posted_by)
  VALUES(_id,'investigating',coalesce(nullif(trim(_public_summary),''),'Incident opened.'),auth.uid());

  INSERT INTO public.audit_logs(admin_id,action,entity_type,entity_id,new_values)
  VALUES(auth.uid(),'incident.create','incident',_id::text,jsonb_build_object('title',_title,'severity',_severity));

  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_incident(text,text,text,text,text[],boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_incident(text,text,text,text,text[],boolean,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_post_incident_update(
  _incident_id uuid,
  _status text,
  _message text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _status NOT IN ('investigating','identified','monitoring','resolved') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF coalesce(length(trim(_message)),0) < 3 THEN
    RAISE EXCEPTION 'message required';
  END IF;

  INSERT INTO public.incident_updates(incident_id,status,message,posted_by)
  VALUES(_incident_id,_status,trim(_message),auth.uid())
  RETURNING id INTO _uid;

  UPDATE public.incidents
  SET status = _status,
      resolved_at = CASE WHEN _status = 'resolved' THEN now() ELSE resolved_at END,
      updated_at = now()
  WHERE id = _incident_id;

  INSERT INTO public.audit_logs(admin_id,action,entity_type,entity_id,new_values)
  VALUES(auth.uid(),'incident.update','incident',_incident_id::text,jsonb_build_object('status',_status));

  RETURN _uid;
END $$;
REVOKE ALL ON FUNCTION public.admin_post_incident_update(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_post_incident_update(uuid,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_create_export_request(
  _subject_user_id uuid,
  _request_type text DEFAULT 'gdpr_sar',
  _scopes text[] DEFAULT ARRAY['profile','orders','addresses','loyalty','reviews','support']::text[],
  _reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _request_type NOT IN ('gdpr_sar','ccpa','internal_audit','legal_hold') THEN
    RAISE EXCEPTION 'invalid request type';
  END IF;
  IF coalesce(array_length(_scopes, 1), 0) = 0 THEN
    RAISE EXCEPTION 'at least one scope is required';
  END IF;

  SELECT email INTO _email FROM public.profiles WHERE id = _subject_user_id LIMIT 1;

  INSERT INTO public.compliance_export_requests
    (subject_user_id, subject_email, request_type, scopes, reason, requested_by, expires_at)
  VALUES (_subject_user_id, _email, _request_type, _scopes, _reason, auth.uid(), now() + interval '7 days')
  RETURNING id INTO _id;

  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'compliance_export_requested', 'compliance_export', _id::text,
          jsonb_build_object('subject_user_id', _subject_user_id, 'request_type', _request_type, 'scopes', _scopes));
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_export_request(uuid, text, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_export_request(uuid, text, text[], text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_revoke_admin_session(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.admin_session_activity
     SET revoked_at = now(), revoked_by = auth.uid(), updated_at = now()
   WHERE id = _session_id AND revoked_at IS NULL;

  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'admin_session_revoked', 'admin_session', _session_id::text, jsonb_build_object('revoked_at', now()));
END $$;
REVOKE ALL ON FUNCTION public.admin_revoke_admin_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_admin_session(uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.feature_flag_rollouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  rollout_name text NOT NULL,
  target_state boolean NOT NULL DEFAULT true,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','customers','vendors','admins','staff','beta')),
  rollout_percentage integer NOT NULL DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','completed','cancelled','rolled_back','failed')),
  scheduled_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  rollback_reason text,
  safety_threshold jsonb NOT NULL DEFAULT '{"max_error_rate":5,"max_p95_latency_ms":3000}'::jsonb,
  metrics_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flag_rollouts TO authenticated;
GRANT ALL ON public.feature_flag_rollouts TO service_role;
ALTER TABLE public.feature_flag_rollouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view feature flag rollouts"
  ON public.feature_flag_rollouts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage feature flag rollouts"
  ON public.feature_flag_rollouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_feature_flag_rollouts_status_time ON public.feature_flag_rollouts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_feature_flag_rollouts_flag ON public.feature_flag_rollouts(feature_flag_id, created_at DESC);
DROP TRIGGER IF EXISTS trg_feature_flag_rollouts_updated ON public.feature_flag_rollouts;
CREATE TRIGGER trg_feature_flag_rollouts_updated
  BEFORE UPDATE ON public.feature_flag_rollouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.customer_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','push','email','whatsapp','all')),
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','customers','vendors','admins','inactive','loyalty','custom')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','paused','cancelled','failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_broadcasts TO authenticated;
GRANT ALL ON public.customer_broadcasts TO service_role;
ALTER TABLE public.customer_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view customer broadcasts"
  ON public.customer_broadcasts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage customer broadcasts"
  ON public.customer_broadcasts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_customer_broadcasts_status_time ON public.customer_broadcasts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_customer_broadcasts_audience ON public.customer_broadcasts(audience, status, created_at DESC);
DROP TRIGGER IF EXISTS trg_customer_broadcasts_updated ON public.customer_broadcasts;
CREATE TRIGGER trg_customer_broadcasts_updated
  BEFORE UPDATE ON public.customer_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_schedule_feature_rollout(
  _feature_flag_id uuid,
  _rollout_name text,
  _target_state boolean,
  _audience text DEFAULT 'all',
  _rollout_percentage integer DEFAULT 100,
  _scheduled_at timestamptz DEFAULT now(),
  _safety_threshold jsonb DEFAULT '{"max_error_rate":5,"max_p95_latency_ms":3000}'::jsonb,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_feature_flags') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF coalesce(length(trim(_rollout_name)),0) < 3 THEN
    RAISE EXCEPTION 'rollout name required';
  END IF;
  IF _audience NOT IN ('all','customers','vendors','admins','staff','beta') THEN
    RAISE EXCEPTION 'invalid audience';
  END IF;
  IF _rollout_percentage < 0 OR _rollout_percentage > 100 THEN
    RAISE EXCEPTION 'rollout percentage must be between 0 and 100';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE id = _feature_flag_id) THEN
    RAISE EXCEPTION 'feature flag not found';
  END IF;

  INSERT INTO public.feature_flag_rollouts(
    feature_flag_id, rollout_name, target_state, audience, rollout_percentage,
    status, scheduled_at, safety_threshold, notes, created_by
  ) VALUES (
    _feature_flag_id, trim(_rollout_name), _target_state, _audience, _rollout_percentage,
    'scheduled', coalesce(_scheduled_at, now()), coalesce(_safety_threshold, '{}'::jsonb), _notes, auth.uid()
  ) RETURNING id INTO _id;

  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'feature_rollout.schedule', 'feature_flag_rollout', _id::text,
          jsonb_build_object('feature_flag_id', _feature_flag_id, 'target_state', _target_state, 'audience', _audience, 'rollout_percentage', _rollout_percentage));

  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.admin_schedule_feature_rollout(uuid,text,boolean,text,integer,timestamptz,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_schedule_feature_rollout(uuid,text,boolean,text,integer,timestamptz,jsonb,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_process_due_feature_rollouts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r record;
  _processed integer := 0;
  _failed integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.admin_has_permission(auth.uid(), 'manage_feature_flags') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _r IN
    SELECT r.*, f.feature_key
    FROM public.feature_flag_rollouts r
    JOIN public.feature_flags f ON f.id = r.feature_flag_id
    WHERE r.status = 'scheduled'
      AND r.scheduled_at <= now()
    ORDER BY r.scheduled_at ASC
    LIMIT 50
  LOOP
    BEGIN
      UPDATE public.feature_flag_rollouts
      SET status = 'running', started_at = now(), updated_at = now()
      WHERE id = _r.id;

      UPDATE public.feature_flags
      SET is_enabled = _r.target_state,
          settings = jsonb_set(
            coalesce(settings, '{}'::jsonb),
            '{rollout}',
            jsonb_build_object('audience', _r.audience, 'percentage', _r.rollout_percentage, 'rollout_id', _r.id::text),
            true
          ),
          updated_at = now()
      WHERE id = _r.feature_flag_id;

      UPDATE public.feature_flag_rollouts
      SET status = 'completed', completed_at = now(), metrics_snapshot = jsonb_build_object('processed_at', now(), 'feature_key', _r.feature_key), updated_at = now()
      WHERE id = _r.id;

      INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
      VALUES (coalesce(auth.uid(), _r.created_by), 'feature_rollout.completed', 'feature_flag_rollout', _r.id::text,
              jsonb_build_object('feature_flag_id', _r.feature_flag_id, 'target_state', _r.target_state));
      _processed := _processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.feature_flag_rollouts
      SET status = 'failed', metrics_snapshot = jsonb_build_object('error', SQLERRM, 'failed_at', now()), updated_at = now()
      WHERE id = _r.id;
      _failed := _failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', _processed, 'failed', _failed, 'ran_at', now());
END $$;
REVOKE ALL ON FUNCTION public.admin_process_due_feature_rollouts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_due_feature_rollouts() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_cancel_feature_rollout(_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_feature_flags') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.feature_flag_rollouts
  SET status = CASE WHEN status = 'completed' THEN 'rolled_back' ELSE 'cancelled' END,
      rollback_reason = _reason,
      updated_at = now()
  WHERE id = _id AND status IN ('draft','scheduled','running','completed');

  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'feature_rollout.cancel', 'feature_flag_rollout', _id::text, jsonb_build_object('reason', _reason));
END $$;
REVOKE ALL ON FUNCTION public.admin_cancel_feature_rollout(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cancel_feature_rollout(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_create_customer_broadcast(
  _name text,
  _title text,
  _body text,
  _channel text DEFAULT 'in_app',
  _audience text DEFAULT 'all',
  _scheduled_at timestamptz DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'send_notifications') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF coalesce(length(trim(_name)),0) < 3 OR coalesce(length(trim(_title)),0) < 3 OR coalesce(length(trim(_body)),0) < 3 THEN
    RAISE EXCEPTION 'broadcast content is incomplete';
  END IF;
  IF _channel NOT IN ('in_app','push','email','whatsapp','all') THEN
    RAISE EXCEPTION 'invalid channel';
  END IF;
  IF _audience NOT IN ('all','customers','vendors','admins','inactive','loyalty','custom') THEN
    RAISE EXCEPTION 'invalid audience';
  END IF;

  INSERT INTO public.customer_broadcasts(name,title,body,channel,audience,status,scheduled_at,metadata,created_by)
  VALUES(trim(_name),trim(_title),trim(_body),_channel,_audience,
         CASE WHEN _scheduled_at IS NULL OR _scheduled_at <= now() THEN 'scheduled' ELSE 'scheduled' END,
         coalesce(_scheduled_at, now()), coalesce(_metadata, '{}'::jsonb), auth.uid())
  RETURNING id INTO _id;

  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'customer_broadcast.create', 'customer_broadcast', _id::text,
          jsonb_build_object('channel', _channel, 'audience', _audience, 'scheduled_at', _scheduled_at));

  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_customer_broadcast(text,text,text,text,text,timestamptz,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_customer_broadcast(text,text,text,text,text,timestamptz,jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_process_due_customer_broadcasts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _b record;
  _recipient_ids uuid[];
  _sent integer := 0;
  _failed integer := 0;
  _campaigns integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.admin_has_permission(auth.uid(), 'send_notifications') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _b IN
    SELECT * FROM public.customer_broadcasts
    WHERE status = 'scheduled'
      AND scheduled_at <= now()
    ORDER BY scheduled_at ASC
    LIMIT 25
  LOOP
    BEGIN
      UPDATE public.customer_broadcasts SET status = 'sending', updated_at = now() WHERE id = _b.id;

      SELECT array_agg(p.id) INTO _recipient_ids
      FROM public.profiles p
      WHERE CASE
        WHEN _b.audience = 'admins' THEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
        WHEN _b.audience = 'vendors' THEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'vendor')
        WHEN _b.audience = 'customers' THEN NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role IN ('admin','vendor'))
        ELSE true
      END
      LIMIT 5000;

      INSERT INTO public.notifications(user_id, title, body, type, data)
      SELECT unnest(coalesce(_recipient_ids, ARRAY[]::uuid[])), _b.title, _b.body, 'broadcast',
             jsonb_build_object('broadcast_id', _b.id, 'channel', _b.channel, 'audience', _b.audience);

      GET DIAGNOSTICS _sent = ROW_COUNT;

      UPDATE public.customer_broadcasts
      SET status = 'sent', sent_at = now(), total_recipients = _sent, delivered_count = _sent, failed_count = 0, updated_at = now()
      WHERE id = _b.id;

      INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
      VALUES (coalesce(auth.uid(), _b.created_by), 'customer_broadcast.sent', 'customer_broadcast', _b.id::text,
              jsonb_build_object('recipients', _sent));
      _campaigns := _campaigns + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.customer_broadcasts
      SET status = 'failed', failed_count = failed_count + 1, metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('error', SQLERRM, 'failed_at', now()), updated_at = now()
      WHERE id = _b.id;
      _failed := _failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('campaigns', _campaigns, 'notifications_inserted', _sent, 'failed', _failed, 'ran_at', now());
END $$;
REVOKE ALL ON FUNCTION public.admin_process_due_customer_broadcasts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_due_customer_broadcasts() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_cancel_customer_broadcast(_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'send_notifications') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.customer_broadcasts
  SET status = 'cancelled', metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('cancel_reason', _reason), updated_at = now()
  WHERE id = _id AND status IN ('draft','scheduled','paused');

  INSERT INTO public.audit_logs(admin_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'customer_broadcast.cancel', 'customer_broadcast', _id::text, jsonb_build_object('reason', _reason));
END $$;
REVOKE ALL ON FUNCTION public.admin_cancel_customer_broadcast(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cancel_customer_broadcast(uuid,text) TO authenticated, service_role;