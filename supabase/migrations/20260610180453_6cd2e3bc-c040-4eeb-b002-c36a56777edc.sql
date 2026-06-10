
-- ===== Batch 31: Scheduled Reports Builder =====

CREATE OR REPLACE FUNCTION public.admin_schedule_report(
  _name text,
  _report_type text,
  _frequency text,
  _format text,
  _recipients text[],
  _filters jsonb DEFAULT '{}'::jsonb,
  _next_run_at timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _next timestamptz;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_analytics') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF coalesce(length(trim(_name)),0) < 3 THEN
    RAISE EXCEPTION 'name too short';
  END IF;
  IF _frequency NOT IN ('daily','weekly','monthly','quarterly') THEN
    RAISE EXCEPTION 'invalid frequency';
  END IF;
  IF _format NOT IN ('pdf','csv','xlsx','json') THEN
    RAISE EXCEPTION 'invalid format';
  END IF;
  IF coalesce(array_length(_recipients,1),0) = 0 THEN
    RAISE EXCEPTION 'at least one recipient is required';
  END IF;

  _next := coalesce(_next_run_at, CASE _frequency
    WHEN 'daily' THEN now() + interval '1 day'
    WHEN 'weekly' THEN now() + interval '7 days'
    WHEN 'monthly' THEN now() + interval '30 days'
    ELSE now() + interval '90 days'
  END);

  INSERT INTO public.scheduled_reports(name,report_type,frequency,format,filters,recipients,is_active,next_run_at,created_by)
  VALUES(trim(_name),_report_type,_frequency,_format,coalesce(_filters,'{}'::jsonb),_recipients,true,_next,auth.uid())
  RETURNING id INTO _id;

  INSERT INTO public.audit_logs(admin_id,action,entity_type,entity_id,new_values)
  VALUES(auth.uid(),'scheduled_report.create','scheduled_report',_id::text,
         jsonb_build_object('name',_name,'frequency',_frequency,'format',_format,'recipients',coalesce(array_length(_recipients,1),0)));
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.admin_schedule_report(text,text,text,text,text[],jsonb,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_schedule_report(text,text,text,text,text[],jsonb,timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_toggle_scheduled_report(_id uuid, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_analytics') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.scheduled_reports SET is_active = _active, updated_at = now() WHERE id = _id;
  INSERT INTO public.audit_logs(admin_id,action,entity_type,entity_id,new_values)
  VALUES(auth.uid(),'scheduled_report.toggle','scheduled_report',_id::text,jsonb_build_object('is_active',_active));
END $$;
REVOKE ALL ON FUNCTION public.admin_toggle_scheduled_report(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_toggle_scheduled_report(uuid,boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_scheduled_report(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_analytics') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.scheduled_reports WHERE id = _id;
  INSERT INTO public.audit_logs(admin_id,action,entity_type,entity_id,new_values)
  VALUES(auth.uid(),'scheduled_report.delete','scheduled_report',_id::text,'{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.admin_delete_scheduled_report(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_scheduled_report(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_process_due_scheduled_reports()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r record;
  _processed integer := 0;
  _next timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.admin_has_permission(auth.uid(), 'view_analytics') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _r IN
    SELECT * FROM public.scheduled_reports
    WHERE is_active = true AND (next_run_at IS NULL OR next_run_at <= now())
    ORDER BY next_run_at NULLS FIRST
    LIMIT 50
  LOOP
    _next := CASE _r.frequency
      WHEN 'daily' THEN now() + interval '1 day'
      WHEN 'weekly' THEN now() + interval '7 days'
      WHEN 'monthly' THEN now() + interval '30 days'
      ELSE now() + interval '90 days'
    END;
    UPDATE public.scheduled_reports
      SET last_sent_at = now(), next_run_at = _next, updated_at = now()
      WHERE id = _r.id;
    _processed := _processed + 1;
  END LOOP;
  RETURN jsonb_build_object('processed', _processed, 'ran_at', now());
END $$;
REVOKE ALL ON FUNCTION public.admin_process_due_scheduled_reports() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_due_scheduled_reports() TO authenticated, service_role;

-- ===== Batch 32: Webhook & DLQ Replay Console =====

CREATE OR REPLACE FUNCTION public.admin_replay_webhook_event(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.webhook_events
    SET status = 'pending', error = NULL, processed_at = NULL
    WHERE id = _id;
  INSERT INTO public.audit_logs(admin_id,action,entity_type,entity_id,new_values)
  VALUES(auth.uid(),'webhook_event.replay','webhook_event',_id::text,jsonb_build_object('queued_at',now()));
END $$;
REVOKE ALL ON FUNCTION public.admin_replay_webhook_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_replay_webhook_event(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_replay_dlq_entry(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.dead_letter_queue
    SET status = 'pending', next_retry_at = now(), resolved_at = NULL, resolved_by = NULL
    WHERE id = _id;
  INSERT INTO public.audit_logs(admin_id,action,entity_type,entity_id,new_values)
  VALUES(auth.uid(),'dlq.replay','dead_letter_queue',_id::text,jsonb_build_object('queued_at',now()));
END $$;
REVOKE ALL ON FUNCTION public.admin_replay_dlq_entry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_replay_dlq_entry(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_resolve_dlq_entry(_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.dead_letter_queue
    SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
    WHERE id = _id;
  INSERT INTO public.audit_logs(admin_id,action,entity_type,entity_id,new_values)
  VALUES(auth.uid(),'dlq.resolve','dead_letter_queue',_id::text,jsonb_build_object('note',_note));
END $$;
REVOKE ALL ON FUNCTION public.admin_resolve_dlq_entry(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dlq_entry(uuid,text) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_due ON public.scheduled_reports(is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status_created ON public.webhook_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dlq_status_created ON public.dead_letter_queue(status, created_at DESC);
