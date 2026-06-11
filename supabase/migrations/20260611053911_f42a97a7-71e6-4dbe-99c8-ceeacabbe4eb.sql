
-- ===== Batch 49: Geo-Block Rules =====
CREATE TABLE public.geo_block_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  country_code TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'deny' CHECK (mode IN ('allow','deny')),
  reason TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, country_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.geo_block_rules TO authenticated;
GRANT ALL ON public.geo_block_rules TO service_role;
ALTER TABLE public.geo_block_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage geo rules" ON public.geo_block_rules
  FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(),'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(),'manage_admins'));

CREATE INDEX idx_geo_block_scope ON public.geo_block_rules(scope, active);

CREATE TRIGGER trg_geo_block_updated
  BEFORE UPDATE ON public.geo_block_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_country_blocked(_scope TEXT, _country TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _has_allow BOOLEAN;
  _country_allowed BOOLEAN;
  _country_denied BOOLEAN;
BEGIN
  IF _country IS NULL THEN RETURN FALSE; END IF;
  SELECT EXISTS (SELECT 1 FROM public.geo_block_rules WHERE scope = _scope AND mode = 'allow' AND active)
    INTO _has_allow;
  IF _has_allow THEN
    SELECT EXISTS (SELECT 1 FROM public.geo_block_rules
      WHERE scope = _scope AND mode = 'allow' AND active AND country_code = upper(_country))
      INTO _country_allowed;
    IF NOT _country_allowed THEN RETURN TRUE; END IF;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.geo_block_rules
    WHERE scope = _scope AND mode = 'deny' AND active AND country_code = upper(_country))
    INTO _country_denied;
  RETURN _country_denied;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_geo_rules_list()
RETURNS SETOF public.geo_block_rules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.geo_block_rules ORDER BY scope, country_code;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_geo_rule(
  _id UUID, _scope TEXT, _country TEXT, _mode TEXT, _reason TEXT, _active BOOLEAN
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rid UUID;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.geo_block_rules (scope, country_code, mode, reason, active, created_by)
    VALUES (lower(_scope), upper(_country), _mode, _reason, COALESCE(_active,true), auth.uid())
    ON CONFLICT (scope, country_code) DO UPDATE
      SET mode = EXCLUDED.mode, reason = EXCLUDED.reason, active = EXCLUDED.active, updated_at = now()
    RETURNING id INTO _rid;
  ELSE
    UPDATE public.geo_block_rules
       SET scope = lower(_scope), country_code = upper(_country),
           mode = _mode, reason = _reason, active = COALESCE(_active,true), updated_at = now()
     WHERE id = _id
    RETURNING id INTO _rid;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'geo_rule.upsert', 'geo_block_rule', _rid::text,
          jsonb_build_object('scope', _scope, 'country', _country, 'mode', _mode));
  RETURN _rid;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_geo_rule(_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.geo_block_rules WHERE id = _id;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'geo_rule.delete', 'geo_block_rule', _id::text);
  RETURN FOUND;
END; $$;

-- ===== Batch 50: Admin Action Approval Queue =====
CREATE TABLE public.admin_action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','expired','executed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.admin_action_approvals TO authenticated;
GRANT ALL ON public.admin_action_approvals TO service_role;
ALTER TABLE public.admin_action_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read approvals" ON public.admin_action_approvals
  FOR SELECT TO authenticated USING (public.admin_has_permission(auth.uid(),'manage_admins'));
CREATE POLICY "Requester inserts approvals" ON public.admin_action_approvals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = requested_by AND public.admin_has_permission(auth.uid(),'manage_admins'));

CREATE INDEX idx_admin_approvals_status ON public.admin_action_approvals(status, expires_at);

CREATE TRIGGER trg_admin_approvals_updated
  BEFORE UPDATE ON public.admin_action_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_request_approval(
  _action_type TEXT, _description TEXT, _payload JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.admin_action_approvals (action_type, description, payload, requested_by)
  VALUES (_action_type, _description, COALESCE(_payload,'{}'::jsonb), auth.uid())
  RETURNING id INTO _id;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'approval.request', 'admin_approval', _id::text, jsonb_build_object('type', _action_type));
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_decide_approval(
  _id UUID, _approve BOOLEAN, _notes TEXT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _req UUID; _status TEXT;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT requested_by, status INTO _req, _status FROM public.admin_action_approvals WHERE id = _id FOR UPDATE;
  IF _req IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF _status <> 'pending' THEN RAISE EXCEPTION 'not pending: %', _status; END IF;
  IF _req = auth.uid() THEN RAISE EXCEPTION 'requester cannot self-approve'; END IF;
  UPDATE public.admin_action_approvals
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'denied' END,
         reviewed_by = auth.uid(), reviewed_at = now(), review_notes = _notes, updated_at = now()
   WHERE id = _id;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'approval.approve' ELSE 'approval.deny' END,
          'admin_approval', _id::text, jsonb_build_object('notes', _notes));
  RETURN TRUE;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_approvals_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r JSONB;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  -- auto-expire stale pendings
  UPDATE public.admin_action_approvals
     SET status = 'expired', updated_at = now()
   WHERE status = 'pending' AND expires_at < now();
  SELECT jsonb_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'denied', COUNT(*) FILTER (WHERE status = 'denied'),
    'expired', COUNT(*) FILTER (WHERE status = 'expired'),
    'executed', COUNT(*) FILTER (WHERE status = 'executed')
  ) INTO _r FROM public.admin_action_approvals;
  RETURN _r;
END; $$;
