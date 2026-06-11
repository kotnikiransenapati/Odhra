
-- =============================================================
-- BATCH 37: Admin IP Allowlist
-- =============================================================
CREATE TABLE IF NOT EXISTS public.admin_ip_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cidr CIDR NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cidr)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_ip_allowlist TO authenticated;
GRANT ALL ON public.admin_ip_allowlist TO service_role;
ALTER TABLE public.admin_ip_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage IP allowlist"
  ON public.admin_ip_allowlist FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE POLICY "Service all IP allowlist"
  ON public.admin_ip_allowlist FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_ip_active ON public.admin_ip_allowlist(is_active) WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.tg_admin_ip_touch() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_admin_ip_touch ON public.admin_ip_allowlist;
CREATE TRIGGER trg_admin_ip_touch BEFORE UPDATE ON public.admin_ip_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.tg_admin_ip_touch();

-- Bypass-safe helper: returns true if no active rules exist OR _ip matches any active rule
CREATE OR REPLACE FUNCTION public.is_admin_ip_allowed(_ip INET)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_has_rules BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_ip_allowlist
     WHERE is_active = true AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_rules;
  IF NOT v_has_rules THEN RETURN true; END IF;
  IF _ip IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_ip_allowlist
     WHERE is_active = true
       AND (expires_at IS NULL OR expires_at > now())
       AND _ip <<= cidr
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_ip_allowlist(
  _id UUID, _cidr TEXT, _label TEXT, _description TEXT,
  _is_active BOOLEAN, _expires_at TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.admin_ip_allowlist(cidr, label, description, is_active, expires_at, created_by)
    VALUES (_cidr::cidr, _label, _description, COALESCE(_is_active,true), _expires_at, auth.uid())
    ON CONFLICT (cidr) DO UPDATE SET
      label = EXCLUDED.label, description = EXCLUDED.description,
      is_active = EXCLUDED.is_active, expires_at = EXCLUDED.expires_at
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.admin_ip_allowlist
       SET cidr = _cidr::cidr, label = _label, description = _description,
           is_active = COALESCE(_is_active, is_active), expires_at = _expires_at
     WHERE id = _id RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'admin_ip.upsert', 'admin_ip_allowlist', v_id,
          jsonb_build_object('cidr', _cidr, 'label', _label));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_toggle_ip_allowlist(_id UUID, _is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  UPDATE public.admin_ip_allowlist SET is_active = _is_active WHERE id = _id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'admin_ip.toggle', 'admin_ip_allowlist', _id, jsonb_build_object('active', _is_active));
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_ip_allowlist(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  DELETE FROM public.admin_ip_allowlist WHERE id = _id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'admin_ip.delete', 'admin_ip_allowlist', _id);
END $$;

-- =============================================================
-- BATCH 38: Notification Templates Registry
-- =============================================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app','email','push','sms','whatsapp')),
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  locale TEXT NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, channel, version, locale)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notification templates"
  ON public.notification_templates FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'send_notifications'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'send_notifications'));

CREATE POLICY "Service all notification templates"
  ON public.notification_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notif_tpl_code_channel ON public.notification_templates(code, channel, locale, is_active);

DROP TRIGGER IF EXISTS trg_notif_tpl_touch ON public.notification_templates;
CREATE TRIGGER trg_notif_tpl_touch BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_admin_ip_touch();

CREATE OR REPLACE FUNCTION public.admin_upsert_notification_template(
  _id UUID, _code TEXT, _channel TEXT, _version INTEGER, _name TEXT,
  _subject TEXT, _body TEXT, _variables JSONB, _locale TEXT,
  _is_active BOOLEAN, _description TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'send_notifications') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.notification_templates(code, channel, version, name, subject, body, variables, locale, is_active, description, created_by)
    VALUES (_code, _channel, COALESCE(_version,1), _name, _subject, _body,
            COALESCE(_variables,'[]'::jsonb), COALESCE(_locale,'en'),
            COALESCE(_is_active,true), _description, auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.notification_templates SET
      code = _code, channel = _channel, version = COALESCE(_version, version),
      name = _name, subject = _subject, body = _body,
      variables = COALESCE(_variables, variables),
      locale = COALESCE(_locale, locale),
      is_active = COALESCE(_is_active, is_active),
      description = _description
    WHERE id = _id RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'notif_template.upsert', 'notification_template', v_id,
          jsonb_build_object('code', _code, 'channel', _channel, 'version', _version));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_toggle_notification_template(_id UUID, _is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'send_notifications') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  UPDATE public.notification_templates SET is_active = _is_active WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_notification_template(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'send_notifications') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  DELETE FROM public.notification_templates WHERE id = _id;
END $$;

-- Safe interpolation: replaces {{var}} tokens with values, escapes nothing (caller responsibility)
CREATE OR REPLACE FUNCTION public.admin_render_notification_template(
  _code TEXT, _channel TEXT, _locale TEXT, _vars JSONB
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t public.notification_templates%ROWTYPE;
  v_subject TEXT; v_body TEXT;
  k TEXT; val TEXT;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'send_notifications') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  SELECT * INTO t FROM public.notification_templates
   WHERE code = _code AND channel = _channel AND locale = COALESCE(_locale,'en') AND is_active = true
   ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template not found: % / % / %', _code, _channel, _locale; END IF;
  v_subject := t.subject; v_body := t.body;
  IF _vars IS NOT NULL THEN
    FOR k, val IN SELECT key, value::text FROM jsonb_each_text(_vars) LOOP
      v_subject := replace(COALESCE(v_subject,''), '{{' || k || '}}', val);
      v_body := replace(v_body, '{{' || k || '}}', val);
    END LOOP;
  END IF;
  RETURN jsonb_build_object(
    'subject', v_subject, 'body', v_body,
    'channel', t.channel, 'code', t.code, 'version', t.version, 'locale', t.locale
  );
END $$;
