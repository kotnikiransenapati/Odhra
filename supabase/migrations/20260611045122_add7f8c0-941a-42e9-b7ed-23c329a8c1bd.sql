
-- =============================================================
-- BATCH 39: Outbound Webhook Subscriptions
-- =============================================================
CREATE TABLE IF NOT EXISTS public.outbound_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_retries INTEGER NOT NULL DEFAULT 5 CHECK (max_retries BETWEEN 0 AND 20),
  timeout_ms INTEGER NOT NULL DEFAULT 10000 CHECK (timeout_ms BETWEEN 1000 AND 60000),
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbound_webhook_subscriptions TO authenticated;
GRANT ALL ON public.outbound_webhook_subscriptions TO service_role;
ALTER TABLE public.outbound_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage webhook subs"
  ON public.outbound_webhook_subscriptions FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));
CREATE POLICY "Service all webhook subs"
  ON public.outbound_webhook_subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_webhook_subs_active ON public.outbound_webhook_subscriptions(is_active) WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.tg_webhook_subs_touch() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_webhook_subs_touch ON public.outbound_webhook_subscriptions;
CREATE TRIGGER trg_webhook_subs_touch BEFORE UPDATE ON public.outbound_webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_subs_touch();

CREATE TABLE IF NOT EXISTS public.outbound_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.outbound_webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  status_code INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.outbound_webhook_deliveries TO authenticated;
GRANT ALL ON public.outbound_webhook_deliveries TO service_role;
ALTER TABLE public.outbound_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read deliveries"
  ON public.outbound_webhook_deliveries FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_error_monitoring'));
CREATE POLICY "Service all deliveries"
  ON public.outbound_webhook_deliveries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_webhook_deliv_sub_time ON public.outbound_webhook_deliveries(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliv_success ON public.outbound_webhook_deliveries(success, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_upsert_webhook_subscription(
  _id UUID, _name TEXT, _target_url TEXT, _event_types TEXT[], _secret TEXT,
  _is_active BOOLEAN, _max_retries INTEGER, _timeout_ms INTEGER,
  _headers JSONB, _description TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_secret TEXT;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  IF _target_url !~* '^https://' THEN RAISE EXCEPTION 'target_url must be https://'; END IF;

  IF _id IS NULL THEN
    v_secret := COALESCE(NULLIF(_secret,''), encode(gen_random_bytes(32), 'hex'));
    INSERT INTO public.outbound_webhook_subscriptions(
      name, target_url, event_types, secret, is_active, max_retries,
      timeout_ms, headers, description, created_by
    ) VALUES (
      _name, _target_url, COALESCE(_event_types, ARRAY[]::TEXT[]), v_secret,
      COALESCE(_is_active,true), COALESCE(_max_retries,5),
      COALESCE(_timeout_ms,10000), COALESCE(_headers,'{}'::jsonb),
      _description, auth.uid()
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.outbound_webhook_subscriptions SET
      name = _name, target_url = _target_url,
      event_types = COALESCE(_event_types, event_types),
      secret = COALESCE(NULLIF(_secret,''), secret),
      is_active = COALESCE(_is_active, is_active),
      max_retries = COALESCE(_max_retries, max_retries),
      timeout_ms = COALESCE(_timeout_ms, timeout_ms),
      headers = COALESCE(_headers, headers),
      description = _description
    WHERE id = _id RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'webhook_sub.upsert', 'outbound_webhook_subscription', v_id,
          jsonb_build_object('name', _name, 'url', _target_url));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_rotate_webhook_secret(_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_secret TEXT;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  v_secret := encode(gen_random_bytes(32), 'hex');
  UPDATE public.outbound_webhook_subscriptions SET secret = v_secret WHERE id = _id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'webhook_sub.rotate_secret', 'outbound_webhook_subscription', _id);
  RETURN v_secret;
END $$;

CREATE OR REPLACE FUNCTION public.admin_toggle_webhook_subscription(_id UUID, _is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  UPDATE public.outbound_webhook_subscriptions SET is_active = _is_active WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_webhook_subscription(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  DELETE FROM public.outbound_webhook_subscriptions WHERE id = _id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'webhook_sub.delete', 'outbound_webhook_subscription', _id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_webhook_delivery_stats(_id UUID, _hours INTEGER DEFAULT 24)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'success', COUNT(*) FILTER (WHERE success),
    'failed', COUNT(*) FILTER (WHERE NOT success),
    'avg_duration_ms', COALESCE(AVG(duration_ms)::int, 0)
  ) INTO v FROM public.outbound_webhook_deliveries
    WHERE subscription_id = _id
      AND created_at >= now() - (GREATEST(_hours,1) || ' hours')::interval;
  RETURN v;
END $$;

-- =============================================================
-- BATCH 40: API Keys
-- =============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,
  use_count BIGINT NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage api keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));
CREATE POLICY "Service all api keys"
  ON public.api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(key_prefix) WHERE revoked_at IS NULL;

DROP TRIGGER IF EXISTS trg_api_keys_touch ON public.api_keys;
CREATE TRIGGER trg_api_keys_touch BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.tg_webhook_subs_touch();

-- Create returns JSONB with the one-time plaintext token (prefix.secret)
CREATE OR REPLACE FUNCTION public.admin_create_api_key(
  _name TEXT, _scopes TEXT[], _description TEXT, _expires_at TIMESTAMPTZ
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefix TEXT; v_secret TEXT; v_hash TEXT; v_id UUID; v_token TEXT;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  v_prefix := 'odk_' || encode(gen_random_bytes(6), 'hex');
  v_secret := encode(gen_random_bytes(32), 'hex');
  v_token  := v_prefix || '.' || v_secret;
  v_hash   := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.api_keys(name, key_prefix, key_hash, scopes, description, created_by, expires_at)
  VALUES (_name, v_prefix, v_hash, COALESCE(_scopes, ARRAY[]::TEXT[]),
          _description, auth.uid(), _expires_at)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'api_key.create', 'api_key', v_id,
          jsonb_build_object('name', _name, 'prefix', v_prefix, 'scopes', _scopes));

  RETURN jsonb_build_object('id', v_id, 'prefix', v_prefix, 'token', v_token);
END $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_api_key(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  UPDATE public.api_keys
     SET revoked_at = now(), revoked_by = auth.uid()
   WHERE id = _id AND revoked_at IS NULL;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'api_key.revoke', 'api_key', _id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_api_key(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  DELETE FROM public.api_keys WHERE id = _id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'api_key.delete', 'api_key', _id);
END $$;

-- Verifier — used by edge functions. Updates last_used and returns row when valid.
CREATE OR REPLACE FUNCTION public.api_key_verify(_token TEXT, _ip INET DEFAULT NULL)
RETURNS TABLE (id UUID, name TEXT, scopes TEXT[]) 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefix TEXT; v_hash TEXT; r public.api_keys%ROWTYPE;
BEGIN
  IF _token IS NULL OR position('.' IN _token) = 0 THEN RETURN; END IF;
  v_prefix := split_part(_token, '.', 1);
  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  SELECT * INTO r FROM public.api_keys
   WHERE key_prefix = v_prefix
     AND key_hash = v_hash
     AND revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > now())
   LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.api_keys
     SET last_used_at = now(), last_used_ip = _ip, use_count = use_count + 1
   WHERE id = r.id;
  id := r.id; name := r.name; scopes := r.scopes;
  RETURN NEXT;
END $$;
