-- Batch 59: Threat Intelligence Feeds
CREATE TABLE public.threat_intel_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  source_url TEXT,
  feed_type TEXT NOT NULL CHECK (feed_type IN ('ip','domain','hash','email')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  indicator_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threat_intel_feeds TO authenticated;
GRANT ALL ON public.threat_intel_feeds TO service_role;
ALTER TABLE public.threat_intel_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage threat feeds" ON public.threat_intel_feeds FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE TABLE public.threat_intel_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES public.threat_intel_feeds(id) ON DELETE CASCADE,
  indicator_type TEXT NOT NULL,
  indicator_value TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  notes TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(feed_id, indicator_value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threat_intel_indicators TO authenticated;
GRANT ALL ON public.threat_intel_indicators TO service_role;
ALTER TABLE public.threat_intel_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage indicators" ON public.threat_intel_indicators FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE INDEX idx_tii_value ON public.threat_intel_indicators(indicator_value) WHERE is_active;
CREATE INDEX idx_tii_feed ON public.threat_intel_indicators(feed_id);

CREATE OR REPLACE FUNCTION public.admin_threat_feeds_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'feeds_total', (SELECT count(*) FROM public.threat_intel_feeds),
    'feeds_active', (SELECT count(*) FROM public.threat_intel_feeds WHERE is_active),
    'indicators_total', (SELECT count(*) FROM public.threat_intel_indicators WHERE is_active),
    'critical_indicators', (SELECT count(*) FROM public.threat_intel_indicators WHERE is_active AND severity = 'critical'),
    'stale_feeds', (SELECT count(*) FROM public.threat_intel_feeds WHERE is_active AND (last_synced_at IS NULL OR last_synced_at < now() - interval '7 days'))
  );
END;$$;

CREATE OR REPLACE FUNCTION public.admin_threat_feeds_list()
RETURNS SETOF public.threat_intel_feeds LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.threat_intel_feeds ORDER BY is_active DESC, name;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_threat_feed(
  _id UUID, _name TEXT, _description TEXT, _source_url TEXT,
  _feed_type TEXT, _severity TEXT, _is_active BOOLEAN
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.threat_intel_feeds(name, description, source_url, feed_type, severity, is_active, created_by)
    VALUES (_name, _description, _source_url, _feed_type, _severity, _is_active, auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.threat_intel_feeds
       SET name=_name, description=_description, source_url=_source_url, feed_type=_feed_type,
           severity=_severity, is_active=_is_active, updated_at=now()
     WHERE id=_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.admin_audit_log(admin_id, action, resource_type, resource_id, new_data)
  VALUES (auth.uid(), 'upsert', 'threat_intel_feed', v_id::text, jsonb_build_object('name', _name));
  RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_add_threat_indicators(
  _feed_id UUID, _indicators JSONB, _severity TEXT DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER := 0; v_item JSONB; v_feed_type TEXT; v_sev TEXT;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT feed_type, severity INTO v_feed_type, v_sev FROM public.threat_intel_feeds WHERE id = _feed_id;
  IF v_feed_type IS NULL THEN RAISE EXCEPTION 'feed not found'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(_indicators) LOOP
    INSERT INTO public.threat_intel_indicators(feed_id, indicator_type, indicator_value, severity, notes)
    VALUES (_feed_id, v_feed_type, v_item->>'value', COALESCE(_severity, v_sev), v_item->>'notes')
    ON CONFLICT (feed_id, indicator_value) DO UPDATE SET last_seen = now(), is_active = true;
    v_count := v_count + 1;
  END LOOP;
  UPDATE public.threat_intel_feeds
     SET last_synced_at = now(),
         indicator_count = (SELECT count(*) FROM public.threat_intel_indicators WHERE feed_id = _feed_id AND is_active)
   WHERE id = _feed_id;
  INSERT INTO public.admin_audit_log(admin_id, action, resource_type, resource_id, new_data)
  VALUES (auth.uid(), 'add_indicators', 'threat_intel_feed', _feed_id::text, jsonb_build_object('count', v_count));
  RETURN v_count;
END;$$;

CREATE OR REPLACE FUNCTION public.check_threat_indicator(_value TEXT)
RETURNS TABLE(matched BOOLEAN, severity TEXT, feed_name TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT true, i.severity, f.name
  FROM public.threat_intel_indicators i
  JOIN public.threat_intel_feeds f ON f.id = i.feed_id
  WHERE i.indicator_value = _value AND i.is_active AND f.is_active
  ORDER BY CASE i.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC
  LIMIT 1;
END;$$;

-- Batch 60: Admin Activity Heatmap
CREATE TABLE public.admin_activity_hourly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_hour TIMESTAMPTZ NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_category TEXT NOT NULL DEFAULT 'general',
  action_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bucket_hour, admin_id, action_category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_activity_hourly TO authenticated;
GRANT ALL ON public.admin_activity_hourly TO service_role;
ALTER TABLE public.admin_activity_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view heatmap" ON public.admin_activity_hourly FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_audit_log'));

CREATE INDEX idx_aah_bucket ON public.admin_activity_hourly(bucket_hour DESC);
CREATE INDEX idx_aah_admin ON public.admin_activity_hourly(admin_id);

CREATE OR REPLACE FUNCTION public.refresh_admin_activity_heatmap(_days INTEGER DEFAULT 7)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows INTEGER;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_audit_log') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.admin_activity_hourly WHERE bucket_hour >= now() - (_days || ' days')::interval;
  INSERT INTO public.admin_activity_hourly(bucket_hour, admin_id, action_category, action_count, error_count)
  SELECT date_trunc('hour', created_at), admin_id,
         COALESCE(split_part(action, '_', 1), 'general'),
         count(*), 0
    FROM public.admin_audit_log
   WHERE created_at >= now() - (_days || ' days')::interval
   GROUP BY 1,2,3;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_activity_heatmap_data(_days INTEGER DEFAULT 7)
RETURNS TABLE(hour_of_day INTEGER, day_of_week INTEGER, action_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_audit_log') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT EXTRACT(HOUR FROM bucket_hour)::int,
         EXTRACT(DOW FROM bucket_hour)::int,
         SUM(action_count)::bigint
    FROM public.admin_activity_hourly
   WHERE bucket_hour >= now() - (_days || ' days')::interval
   GROUP BY 1,2;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_activity_heatmap_stats(_days INTEGER DEFAULT 7)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total BIGINT; v_admins BIGINT; v_peak_hour INTEGER; v_peak_count BIGINT;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_audit_log') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(sum(action_count),0), COUNT(DISTINCT admin_id) INTO v_total, v_admins
    FROM public.admin_activity_hourly
   WHERE bucket_hour >= now() - (_days || ' days')::interval;
  SELECT EXTRACT(HOUR FROM bucket_hour)::int, sum(action_count)::bigint INTO v_peak_hour, v_peak_count
    FROM public.admin_activity_hourly
   WHERE bucket_hour >= now() - (_days || ' days')::interval
   GROUP BY 1 ORDER BY 2 DESC NULLS LAST LIMIT 1;
  RETURN jsonb_build_object('total_actions', COALESCE(v_total,0), 'active_admins', COALESCE(v_admins,0),
    'peak_hour', v_peak_hour, 'peak_count', COALESCE(v_peak_count,0), 'days', _days);
END;$$;