
CREATE TABLE public.email_suppression_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('bounce','complaint','unsubscribe','manual','spam_trap')),
  source TEXT,
  notes TEXT,
  suppression_count INTEGER NOT NULL DEFAULT 1,
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);
CREATE INDEX idx_esl_reason ON public.email_suppression_list(reason) WHERE is_active;
CREATE INDEX idx_esl_active ON public.email_suppression_list(is_active, last_event_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppression_list TO authenticated;
GRANT ALL ON public.email_suppression_list TO service_role;
ALTER TABLE public.email_suppression_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage suppression list"
ON public.email_suppression_list FOR ALL TO authenticated
USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));
CREATE TRIGGER trg_esl_updated BEFORE UPDATE ON public.email_suppression_list
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_suppression_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r JSONB;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE is_active),
    'bounces', COUNT(*) FILTER (WHERE reason='bounce' AND is_active),
    'complaints', COUNT(*) FILTER (WHERE reason='complaint' AND is_active),
    'unsubscribes', COUNT(*) FILTER (WHERE reason='unsubscribe' AND is_active),
    'manual', COUNT(*) FILTER (WHERE reason='manual' AND is_active),
    'last_24h', COUNT(*) FILTER (WHERE last_event_at > now() - interval '24 hours')
  ) INTO r FROM public.email_suppression_list;
  RETURN r;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_suppression_list(_search TEXT DEFAULT NULL, _reason TEXT DEFAULT NULL, _limit INTEGER DEFAULT 100)
RETURNS SETOF public.email_suppression_list LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT * FROM public.email_suppression_list
  WHERE (_search IS NULL OR email ILIKE '%'||_search||'%')
    AND (_reason IS NULL OR reason = _reason)
  ORDER BY last_event_at DESC
  LIMIT LEAST(_limit, 500);
END;$$;

CREATE OR REPLACE FUNCTION public.admin_add_suppression(_email TEXT, _reason TEXT, _notes TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
  INSERT INTO public.email_suppression_list (email, reason, notes, source, added_by)
  VALUES (lower(_email), _reason, _notes, 'manual', auth.uid())
  ON CONFLICT (email) DO UPDATE
    SET suppression_count = email_suppression_list.suppression_count + 1,
        last_event_at = now(), is_active = true,
        reason = EXCLUDED.reason,
        notes = COALESCE(EXCLUDED.notes, email_suppression_list.notes)
  RETURNING id INTO _id;
  RETURN _id;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_suppression(_id UUID, _active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.email_suppression_list SET is_active = _active WHERE id = _id;
END;$$;

-- Batch 62
CREATE TABLE public.admin_feature_adoption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 1,
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (admin_id, feature_key)
);
CREATE INDEX idx_afa_feature ON public.admin_feature_adoption(feature_key, last_used_at DESC);
CREATE INDEX idx_afa_admin ON public.admin_feature_adoption(admin_id, last_used_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_feature_adoption TO authenticated;
GRANT ALL ON public.admin_feature_adoption TO service_role;
ALTER TABLE public.admin_feature_adoption ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read adoption" ON public.admin_feature_adoption
FOR SELECT TO authenticated
USING (public.admin_has_permission(auth.uid(), 'view_audit_log') OR admin_id = auth.uid());
CREATE POLICY "Admins record own usage" ON public.admin_feature_adoption
FOR INSERT TO authenticated WITH CHECK (admin_id = auth.uid());
CREATE POLICY "Admins update own usage" ON public.admin_feature_adoption
FOR UPDATE TO authenticated USING (admin_id = auth.uid());
CREATE TRIGGER trg_afa_updated BEFORE UPDATE ON public.admin_feature_adoption
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.record_admin_feature_usage(_feature_key TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.admin_feature_adoption (admin_id, feature_key)
  VALUES (auth.uid(), _feature_key)
  ON CONFLICT (admin_id, feature_key)
  DO UPDATE SET usage_count = admin_feature_adoption.usage_count + 1, last_used_at = now();
END;$$;

CREATE OR REPLACE FUNCTION public.admin_feature_adoption_stats(_days INTEGER DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r JSONB;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_audit_log') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_features', COUNT(DISTINCT feature_key),
    'active_admins', COUNT(DISTINCT admin_id),
    'total_events', COALESCE(SUM(usage_count), 0),
    'recent_events', COALESCE(SUM(usage_count) FILTER (WHERE last_used_at > now() - (_days || ' days')::interval), 0)
  ) INTO r FROM public.admin_feature_adoption;
  RETURN r;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_feature_adoption_leaderboard(_days INTEGER DEFAULT 30)
RETURNS TABLE(feature_key TEXT, total_uses BIGINT, unique_admins BIGINT, last_used TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_audit_log') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT a.feature_key, SUM(a.usage_count)::BIGINT, COUNT(DISTINCT a.admin_id)::BIGINT, MAX(a.last_used_at)
  FROM public.admin_feature_adoption a
  WHERE a.last_used_at > now() - (_days || ' days')::interval
  GROUP BY a.feature_key
  ORDER BY SUM(a.usage_count) DESC
  LIMIT 50;
END;$$;
