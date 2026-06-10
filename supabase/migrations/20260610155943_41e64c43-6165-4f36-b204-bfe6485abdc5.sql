
-- ============ BATCH 27: COMPLIANCE EXPORT CENTER ============
CREATE TABLE public.compliance_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid NOT NULL,
  subject_email text,
  request_type text NOT NULL DEFAULT 'gdpr_sar' CHECK (request_type IN ('gdpr_sar','ccpa','internal_audit','legal_hold')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed','expired')),
  scopes text[] NOT NULL DEFAULT ARRAY['profile','orders','addresses','loyalty','reviews','support']::text[],
  file_url text,
  file_size_bytes bigint,
  reason text,
  requested_by uuid NOT NULL,
  processed_at timestamptz,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.compliance_export_requests TO authenticated;
GRANT ALL ON public.compliance_export_requests TO service_role;
ALTER TABLE public.compliance_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_view_exports" ON public.compliance_export_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins_manage_exports" ON public.compliance_export_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_compliance_exports_subject ON public.compliance_export_requests(subject_user_id, created_at DESC);
CREATE INDEX idx_compliance_exports_status ON public.compliance_export_requests(status, created_at DESC);

CREATE TRIGGER trg_compliance_exports_updated
  BEFORE UPDATE ON public.compliance_export_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_create_export_request(
  _subject_user_id uuid,
  _request_type text DEFAULT 'gdpr_sar',
  _scopes text[] DEFAULT ARRAY['profile','orders','addresses','loyalty','reviews','support']::text[],
  _reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
  _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT email INTO _email FROM public.profiles WHERE id = _subject_user_id LIMIT 1;
  INSERT INTO public.compliance_export_requests
    (subject_user_id, subject_email, request_type, scopes, reason, requested_by, expires_at)
  VALUES (_subject_user_id, _email, _request_type, _scopes, _reason, auth.uid(), now() + interval '7 days')
  RETURNING id INTO _id;

  INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, new_values)
  VALUES (auth.uid(), 'compliance_export_requested', 'compliance_export', _id,
          jsonb_build_object('subject_user_id', _subject_user_id, 'request_type', _request_type, 'scopes', _scopes));
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_export_request(uuid, text, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_export_request(uuid, text, text[], text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_export_requests(_limit int DEFAULT 100)
RETURNS SETOF public.compliance_export_requests
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT * FROM public.compliance_export_requests
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC
  LIMIT GREATEST(LEAST(_limit, 500), 1);
$$;
REVOKE ALL ON FUNCTION public.admin_list_export_requests(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_export_requests(int) TO authenticated, service_role;

-- ============ BATCH 28: ADMIN SESSION ACTIVITY TRACKER ============
CREATE TABLE public.admin_session_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  session_token_hash text NOT NULL,
  ip_address text,
  country text,
  user_agent text,
  is_suspicious boolean NOT NULL DEFAULT false,
  suspicious_reason text,
  revoked_at timestamptz,
  revoked_by uuid,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_session_activity TO authenticated;
GRANT ALL ON public.admin_session_activity TO service_role;
ALTER TABLE public.admin_session_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_view_sessions" ON public.admin_session_activity
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins_manage_sessions" ON public.admin_session_activity
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_sessions_admin ON public.admin_session_activity(admin_user_id, last_seen_at DESC);
CREATE INDEX idx_admin_sessions_suspicious ON public.admin_session_activity(is_suspicious, last_seen_at DESC) WHERE is_suspicious;

CREATE TRIGGER trg_admin_session_activity_updated
  BEFORE UPDATE ON public.admin_session_activity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_record_admin_session(
  _session_token_hash text,
  _ip_address text DEFAULT NULL,
  _country text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
  _last record;
  _suspicious boolean := false;
  _reason text := NULL;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT ip_address, country INTO _last
  FROM public.admin_session_activity
  WHERE admin_user_id = auth.uid()
  ORDER BY last_seen_at DESC LIMIT 1;

  IF _last.country IS NOT NULL AND _country IS NOT NULL AND _last.country <> _country THEN
    _suspicious := true;
    _reason := 'country_change:' || _last.country || '->' || _country;
  ELSIF _last.ip_address IS NOT NULL AND _ip_address IS NOT NULL AND _last.ip_address <> _ip_address THEN
    _suspicious := true;
    _reason := 'ip_change';
  END IF;

  INSERT INTO public.admin_session_activity
    (admin_user_id, session_token_hash, ip_address, country, user_agent, is_suspicious, suspicious_reason)
  VALUES (auth.uid(), _session_token_hash, _ip_address, _country, _user_agent, _suspicious, _reason)
  ON CONFLICT DO NOTHING
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.admin_record_admin_session(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_record_admin_session(text, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_admin_sessions(_only_active boolean DEFAULT true, _limit int DEFAULT 200)
RETURNS SETOF public.admin_session_activity
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT * FROM public.admin_session_activity
  WHERE public.has_role(auth.uid(), 'admin')
    AND (NOT _only_active OR revoked_at IS NULL)
  ORDER BY last_seen_at DESC
  LIMIT GREATEST(LEAST(_limit, 500), 1);
$$;
REVOKE ALL ON FUNCTION public.admin_list_admin_sessions(boolean, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_admin_sessions(boolean, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_revoke_admin_session(_session_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.admin_session_activity
     SET revoked_at = now(), revoked_by = auth.uid()
   WHERE id = _session_id AND revoked_at IS NULL;

  INSERT INTO public.audit_logs (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'admin_session_revoked', 'admin_session', _session_id);
END $$;
REVOKE ALL ON FUNCTION public.admin_revoke_admin_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_admin_session(uuid) TO authenticated, service_role;
