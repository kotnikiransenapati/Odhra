
CREATE TABLE public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint_hash TEXT NOT NULL,
  label TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_fingerprint_hash)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_devices TO authenticated;
GRANT ALL ON public.trusted_devices TO service_role;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trusted devices" ON public.trusted_devices
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read trusted devices" ON public.trusted_devices
  FOR SELECT TO authenticated USING (public.admin_has_permission(auth.uid(),'manage_admins'));

CREATE INDEX idx_trusted_devices_user ON public.trusted_devices(user_id, last_seen_at DESC);
CREATE INDEX idx_trusted_devices_active ON public.trusted_devices(revoked_at) WHERE revoked_at IS NULL;

CREATE TRIGGER trg_trusted_devices_updated
  BEFORE UPDATE ON public.trusted_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.upsert_trusted_device(
  _fingerprint_hash TEXT, _label TEXT DEFAULT NULL, _user_agent TEXT DEFAULT NULL,
  _ip_hash TEXT DEFAULT NULL, _ttl_days INT DEFAULT 60
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.trusted_devices (user_id, device_fingerprint_hash, label, user_agent, ip_hash, expires_at)
  VALUES (auth.uid(), _fingerprint_hash, _label, _user_agent, _ip_hash, now() + (_ttl_days || ' days')::interval)
  ON CONFLICT (user_id, device_fingerprint_hash) DO UPDATE
    SET last_seen_at = now(),
        user_agent = COALESCE(EXCLUDED.user_agent, public.trusted_devices.user_agent),
        ip_hash = COALESCE(EXCLUDED.ip_hash, public.trusted_devices.ip_hash),
        label = COALESCE(EXCLUDED.label, public.trusted_devices.label),
        revoked_at = NULL,
        expires_at = now() + (_ttl_days || ' days')::interval,
        updated_at = now()
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.is_device_trusted(_user UUID, _fingerprint_hash TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trusted_devices
    WHERE user_id = _user AND device_fingerprint_hash = _fingerprint_hash
      AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()));
$$;

CREATE OR REPLACE FUNCTION public.admin_trusted_devices_stats(_days INT DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r JSONB;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())),
    'revoked', COUNT(*) FILTER (WHERE revoked_at IS NOT NULL),
    'expired', COUNT(*) FILTER (WHERE revoked_at IS NULL AND expires_at IS NOT NULL AND expires_at <= now()),
    'new_in_window', COUNT(*) FILTER (WHERE created_at >= now() - (_days || ' days')::interval),
    'unique_users', COUNT(DISTINCT user_id),
    'window_days', _days
  ) INTO _r FROM public.trusted_devices;
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_trusted_devices_list(_limit INT DEFAULT 100, _only_active BOOLEAN DEFAULT FALSE)
RETURNS TABLE (id UUID, user_id UUID, email TEXT, label TEXT, user_agent TEXT,
  last_seen_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT td.id, td.user_id, u.email::text, td.label, td.user_agent,
         td.last_seen_at, td.expires_at, td.revoked_at, td.created_at
  FROM public.trusted_devices td LEFT JOIN auth.users u ON u.id = td.user_id
  WHERE (NOT _only_active) OR (td.revoked_at IS NULL AND (td.expires_at IS NULL OR td.expires_at > now()))
  ORDER BY td.last_seen_at DESC LIMIT _limit;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_trusted_device(_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.trusted_devices SET revoked_at = now(), revoked_by = auth.uid(), updated_at = now()
   WHERE id = _id AND revoked_at IS NULL;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'trusted_device.revoke', 'trusted_device', _id::text, jsonb_build_object('via','admin'));
  RETURN FOUND;
END; $$;

-- ===== CAPTCHA Verifications =====
CREATE TABLE public.captcha_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'recaptcha_v3',
  action TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  score NUMERIC(4,3),
  threshold NUMERIC(4,3),
  hostname TEXT,
  ip_hash TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_codes TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.captcha_verifications TO authenticated;
GRANT INSERT ON public.captcha_verifications TO anon;
GRANT ALL ON public.captcha_verifications TO service_role;
ALTER TABLE public.captcha_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service inserts captcha events" ON public.captcha_verifications
  FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Admins read captcha events" ON public.captcha_verifications
  FOR SELECT TO authenticated USING (public.admin_has_permission(auth.uid(),'view_error_monitoring'));

CREATE INDEX idx_captcha_created ON public.captcha_verifications(created_at DESC);
CREATE INDEX idx_captcha_action ON public.captcha_verifications(action, created_at DESC);
CREATE INDEX idx_captcha_success ON public.captcha_verifications(success, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_captcha_stats(_days INT DEFAULT 7)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r JSONB; _since TIMESTAMPTZ := now() - (_days || ' days')::interval;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_error_monitoring') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'success', COUNT(*) FILTER (WHERE success),
    'failed', COUNT(*) FILTER (WHERE NOT success),
    'avg_score', ROUND(AVG(score)::numeric, 3),
    'low_score', COUNT(*) FILTER (WHERE score IS NOT NULL AND threshold IS NOT NULL AND score < threshold),
    'window_days', _days,
    'by_action', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('action', action, 'total', total, 'failed', failed, 'avg_score', avg_score) ORDER BY total DESC), '[]'::jsonb)
      FROM (
        SELECT action, COUNT(*) AS total, COUNT(*) FILTER (WHERE NOT success) AS failed,
               ROUND(AVG(score)::numeric, 3) AS avg_score
        FROM public.captcha_verifications WHERE created_at >= _since
        GROUP BY action ORDER BY COUNT(*) DESC LIMIT 20
      ) t
    )
  ) INTO _r FROM public.captcha_verifications WHERE created_at >= _since;
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_captcha_recent(_limit INT DEFAULT 100, _only_failed BOOLEAN DEFAULT FALSE)
RETURNS TABLE (id UUID, provider TEXT, action TEXT, success BOOLEAN, score NUMERIC,
  threshold NUMERIC, hostname TEXT, error_codes TEXT[], created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_error_monitoring') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT c.id, c.provider, c.action, c.success, c.score, c.threshold,
         c.hostname, c.error_codes, c.created_at
  FROM public.captcha_verifications c
  WHERE (NOT _only_failed) OR (NOT c.success)
  ORDER BY c.created_at DESC LIMIT _limit;
END; $$;
