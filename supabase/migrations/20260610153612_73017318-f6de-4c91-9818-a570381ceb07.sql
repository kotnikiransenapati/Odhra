
-- ============ Incidents ============
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('minor','major','critical','maintenance')),
  status text NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','identified','monitoring','resolved')),
  affected_services text[] NOT NULL DEFAULT '{}',
  impact text NOT NULL DEFAULT '',
  public_summary text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid,
  source_alert_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.incidents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads visible incidents"
  ON public.incidents FOR SELECT
  USING (is_public = true);
CREATE POLICY "Admins manage incidents"
  ON public.incidents FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_started_at ON public.incidents(started_at DESC);

-- ============ Incident updates timeline ============
CREATE TABLE IF NOT EXISTS public.incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('investigating','identified','monitoring','resolved')),
  message text NOT NULL,
  posted_by uuid,
  posted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.incident_updates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.incident_updates TO authenticated;
GRANT ALL ON public.incident_updates TO service_role;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads updates of visible incidents"
  ON public.incident_updates FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.is_public = true));
CREATE POLICY "Admins manage updates"
  ON public.incident_updates FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON public.incident_updates(incident_id, posted_at DESC);

CREATE OR REPLACE FUNCTION public._touch_incidents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_incidents_touch ON public.incidents;
CREATE TRIGGER trg_incidents_touch BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public._touch_incidents_updated_at();

-- ============ Admin RPCs ============
CREATE OR REPLACE FUNCTION public.admin_create_incident(
  _title text, _severity text, _impact text, _public_summary text,
  _affected_services text[], _is_public boolean DEFAULT true, _source_alert_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF coalesce(length(trim(_title)),0) < 3 THEN RAISE EXCEPTION 'title too short'; END IF;
  INSERT INTO public.incidents(title,severity,impact,public_summary,affected_services,is_public,created_by,source_alert_id)
  VALUES(_title,_severity,_impact,_public_summary,coalesce(_affected_services,'{}'),_is_public,auth.uid(),_source_alert_id)
  RETURNING id INTO _id;
  INSERT INTO public.incident_updates(incident_id,status,message,posted_by)
  VALUES(_id,'investigating',coalesce(nullif(_public_summary,''),'Incident opened.'),auth.uid());
  INSERT INTO public.audit_logs(admin_id,action,resource_type,resource_id,new_values)
  VALUES(auth.uid(),'incident.create','incident',_id::text,jsonb_build_object('title',_title,'severity',_severity));
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_incident(text,text,text,text,text[],boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_incident(text,text,text,text,text[],boolean,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_post_incident_update(
  _incident_id uuid, _status text, _message text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF coalesce(length(trim(_message)),0) < 3 THEN RAISE EXCEPTION 'message required'; END IF;
  INSERT INTO public.incident_updates(incident_id,status,message,posted_by)
  VALUES(_incident_id,_status,_message,auth.uid()) RETURNING id INTO _uid;
  UPDATE public.incidents SET status=_status,
    resolved_at = CASE WHEN _status='resolved' THEN now() ELSE resolved_at END
    WHERE id=_incident_id;
  INSERT INTO public.audit_logs(admin_id,action,resource_type,resource_id,new_values)
  VALUES(auth.uid(),'incident.update','incident',_incident_id::text,jsonb_build_object('status',_status));
  RETURN _uid;
END $$;
REVOKE ALL ON FUNCTION public.admin_post_incident_update(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_post_incident_update(uuid,text,text) TO authenticated, service_role;

-- ============ Public status snapshot ============
CREATE OR REPLACE FUNCTION public.public_status_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _result jsonb;
BEGIN
  WITH active AS (
    SELECT id,title,severity,status,affected_services,public_summary,started_at,updated_at
    FROM public.incidents
    WHERE is_public = true AND status <> 'resolved'
    ORDER BY started_at DESC
  ), recent AS (
    SELECT id,title,severity,status,started_at,resolved_at
    FROM public.incidents
    WHERE is_public = true AND status = 'resolved'
      AND resolved_at > now() - interval '14 days'
    ORDER BY resolved_at DESC LIMIT 20
  ), services AS (
    SELECT DISTINCT ON (service) service, status, latency_ms, reported_at
    FROM public.system_heartbeats
    WHERE reported_at > now() - interval '24 hours'
    ORDER BY service, reported_at DESC
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'overall', CASE
      WHEN EXISTS (SELECT 1 FROM active WHERE severity IN ('critical','major')) THEN 'major_outage'
      WHEN EXISTS (SELECT 1 FROM active) THEN 'degraded'
      WHEN EXISTS (SELECT 1 FROM services WHERE status = 'down') THEN 'degraded'
      ELSE 'operational'
    END,
    'active_incidents', coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM active a), '[]'::jsonb),
    'recent_incidents', coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM recent r), '[]'::jsonb),
    'services', coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM services s), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END $$;
REVOKE ALL ON FUNCTION public.public_status_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_status_snapshot() TO anon, authenticated, service_role;
