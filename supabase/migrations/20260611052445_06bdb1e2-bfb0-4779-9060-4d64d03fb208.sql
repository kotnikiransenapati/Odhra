
-- =====================================================================
-- BATCH 45 — GDPR CONSENT LEDGER
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.consent_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_hash text,
  consent_type text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  granted boolean NOT NULL,
  source text NOT NULL DEFAULT 'unknown',
  ip_hash text,
  user_agent_hash text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.consent_ledger TO authenticated;
GRANT SELECT ON public.consent_ledger TO anon;
GRANT ALL ON public.consent_ledger TO service_role;

ALTER TABLE public.consent_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_self_read" ON public.consent_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "consent_self_insert" ON public.consent_ledger
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "consent_admin_read" ON public.consent_ledger
  FOR SELECT TO authenticated USING (public.admin_has_permission(auth.uid(),'manage_admins'));
CREATE POLICY "consent_service_all" ON public.consent_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_consent_user_type ON public.consent_ledger (user_id, consent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_type_created ON public.consent_ledger (consent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_visitor ON public.consent_ledger (visitor_hash) WHERE visitor_hash IS NOT NULL;

-- Latest state per (user/visitor, type)
CREATE OR REPLACE FUNCTION public.latest_consent(_user uuid, _type text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT granted FROM public.consent_ledger
   WHERE user_id = _user AND consent_type = _type
   ORDER BY created_at DESC LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.latest_consent(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_consent(
  _consent_type text, _granted boolean,
  _version text DEFAULT '1.0', _source text DEFAULT 'unknown',
  _visitor_hash text DEFAULT NULL, _ip_hash text DEFAULT NULL,
  _user_agent_hash text DEFAULT NULL, _evidence jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL AND _visitor_hash IS NULL THEN
    RAISE EXCEPTION 'visitor_hash required for anonymous consent';
  END IF;
  INSERT INTO public.consent_ledger
    (user_id, visitor_hash, consent_type, version, granted, source, ip_hash, user_agent_hash, evidence)
  VALUES
    (auth.uid(), _visitor_hash, _consent_type, COALESCE(_version,'1.0'), _granted,
     COALESCE(_source,'unknown'), _ip_hash, _user_agent_hash, COALESCE(_evidence,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.record_consent(text, boolean, text, text, text, text, text, jsonb) TO authenticated, anon;

-- Admin stats / feed
CREATE OR REPLACE FUNCTION public.admin_consent_stats(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _since timestamptz := now() - make_interval(days => GREATEST(_days,1));
        _by_type jsonb; _by_source jsonb; _total bigint; _granted bigint;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT COUNT(*), COUNT(*) FILTER (WHERE granted)
    INTO _total, _granted FROM public.consent_ledger WHERE created_at >= _since;

  SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) INTO _by_type FROM (
    SELECT consent_type,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE granted) AS granted_count,
           COUNT(*) FILTER (WHERE NOT granted) AS revoked_count
      FROM public.consent_ledger WHERE created_at >= _since
     GROUP BY consent_type ORDER BY total DESC LIMIT 20
  ) t;

  SELECT COALESCE(jsonb_agg(s),'[]'::jsonb) INTO _by_source FROM (
    SELECT source, COUNT(*) AS total
      FROM public.consent_ledger WHERE created_at >= _since
     GROUP BY source ORDER BY total DESC
  ) s;

  RETURN jsonb_build_object(
    'total', COALESCE(_total,0),
    'granted', COALESCE(_granted,0),
    'revoked', COALESCE(_total,0) - COALESCE(_granted,0),
    'by_type', _by_type,
    'by_source', _by_source,
    'window_days', _days
  );
END $$;
GRANT EXECUTE ON FUNCTION public.admin_consent_stats(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_consent_feed(
  _limit integer DEFAULT 100,
  _type text DEFAULT NULL,
  _only_revoked boolean DEFAULT false
) RETURNS TABLE (
  id uuid, user_id uuid, email text, visitor_hash text,
  consent_type text, version text, granted boolean, source text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT c.id, c.user_id, u.email::text, c.visitor_hash,
           c.consent_type, c.version, c.granted, c.source, c.created_at
      FROM public.consent_ledger c
      LEFT JOIN auth.users u ON u.id = c.user_id
     WHERE (_type IS NULL OR c.consent_type = _type)
       AND (NOT _only_revoked OR c.granted = false)
     ORDER BY c.created_at DESC
     LIMIT GREATEST(_limit,1);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_consent_feed(integer, text, boolean) TO authenticated;

-- =====================================================================
-- BATCH 46 — INBOUND WEBHOOK IP ALLOWLIST
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.inbound_webhook_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  label text,
  cidr cidr NOT NULL,
  endpoint_path text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbound_webhook_allowlist TO authenticated;
GRANT ALL ON public.inbound_webhook_allowlist TO service_role;
ALTER TABLE public.inbound_webhook_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbound_wh_admin_all" ON public.inbound_webhook_allowlist
  FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(),'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(),'manage_admins'));
CREATE POLICY "inbound_wh_service_all" ON public.inbound_webhook_allowlist
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_inbound_wh_provider ON public.inbound_webhook_allowlist (provider, active);

DROP TRIGGER IF EXISTS trg_inbound_wh_updated ON public.inbound_webhook_allowlist;
CREATE TRIGGER trg_inbound_wh_updated BEFORE UPDATE ON public.inbound_webhook_allowlist
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verification helper — true if no active rules for provider OR ip matches
CREATE OR REPLACE FUNCTION public.is_inbound_webhook_ip_allowed(_provider text, _ip inet)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _has_rules boolean; _matched boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.inbound_webhook_allowlist
     WHERE provider = _provider AND active = true
       AND (expires_at IS NULL OR expires_at > now())
  ) INTO _has_rules;
  IF NOT _has_rules THEN RETURN true; END IF;
  IF _ip IS NULL THEN RETURN false; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.inbound_webhook_allowlist
     WHERE provider = _provider AND active = true
       AND (expires_at IS NULL OR expires_at > now())
       AND _ip <<= cidr
  ) INTO _matched;
  RETURN _matched;
END $$;
GRANT EXECUTE ON FUNCTION public.is_inbound_webhook_ip_allowed(text, inet) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.admin_inbound_webhook_list()
RETURNS SETOF public.inbound_webhook_allowlist
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.inbound_webhook_allowlist
   ORDER BY provider, created_at DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_inbound_webhook_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_inbound_webhook_rule(
  _id uuid, _provider text, _label text, _cidr text,
  _endpoint_path text, _active boolean, _notes text, _expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _new_id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _provider IS NULL OR length(trim(_provider)) = 0 THEN
    RAISE EXCEPTION 'provider required';
  END IF;
  IF _id IS NULL THEN
    INSERT INTO public.inbound_webhook_allowlist
      (provider, label, cidr, endpoint_path, active, notes, expires_at, created_by)
    VALUES (_provider, _label, _cidr::cidr, _endpoint_path, COALESCE(_active,true), _notes, _expires_at, auth.uid())
    RETURNING id INTO _new_id;
  ELSE
    UPDATE public.inbound_webhook_allowlist
       SET provider = _provider, label = _label, cidr = _cidr::cidr,
           endpoint_path = _endpoint_path, active = COALESCE(_active,true),
           notes = _notes, expires_at = _expires_at, updated_at = now()
     WHERE id = _id
     RETURNING id INTO _new_id;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'inbound_webhook.upsert', 'inbound_webhook_allowlist', _new_id::text,
          jsonb_build_object('provider', _provider, 'cidr', _cidr, 'active', _active));
  RETURN _new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_upsert_inbound_webhook_rule(uuid, text, text, text, text, boolean, text, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_inbound_webhook_rule(_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.inbound_webhook_allowlist WHERE id = _id;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'inbound_webhook.delete', 'inbound_webhook_allowlist', _id::text);
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_delete_inbound_webhook_rule(uuid) TO authenticated;
