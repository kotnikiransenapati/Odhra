
-- =====================================================
-- BATCH 75: Vendor Announcements
-- =====================================================
CREATE TABLE public.vendor_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','policy','payout','product','outage','promotion')),
  target_mode TEXT NOT NULL DEFAULT 'all' CHECK (target_mode IN ('all','kyc_verified','specific')),
  target_vendor_ids UUID[] DEFAULT '{}',
  cta_label TEXT,
  cta_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  publish_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendor_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.vendor_announcements(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, vendor_id)
);

CREATE INDEX idx_vendor_announcements_status ON public.vendor_announcements(status, publish_at DESC);
CREATE INDEX idx_vendor_announcement_reads_vendor ON public.vendor_announcement_reads(vendor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_announcements TO authenticated;
GRANT ALL ON public.vendor_announcements TO service_role;
GRANT SELECT, INSERT, DELETE ON public.vendor_announcement_reads TO authenticated;
GRANT ALL ON public.vendor_announcement_reads TO service_role;

ALTER TABLE public.vendor_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage announcements" ON public.vendor_announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors read targeted published announcements" ON public.vendor_announcements
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (publish_at IS NULL OR publish_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.user_id = auth.uid()
        AND (
          target_mode = 'all'
          OR (target_mode = 'kyc_verified' AND v.kyc_status = 'verified')
          OR (target_mode = 'specific' AND v.id = ANY(target_vendor_ids))
        )
    )
  );

CREATE POLICY "Admins read all announcement reads" ON public.vendor_announcement_reads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors manage their own reads" ON public.vendor_announcement_reads
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));

CREATE TRIGGER trg_vendor_announcements_updated_at
  BEFORE UPDATE ON public.vendor_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_vendor_announcements_list(_status TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _rows JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb) INTO _rows
  FROM (
    SELECT a.*,
      (SELECT COUNT(*) FROM public.vendor_announcement_reads r WHERE r.announcement_id = a.id) AS read_count
    FROM public.vendor_announcements a
    WHERE _status IS NULL OR a.status = _status
  ) t;
  RETURN _rows;
END; $$;

CREATE OR REPLACE FUNCTION public.vendor_my_announcements()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _rows JSONB; _vendor UUID;
BEGIN
  SELECT id INTO _vendor FROM public.vendors WHERE user_id = auth.uid() LIMIT 1;
  IF _vendor IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY 
    CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
    t.publish_at DESC NULLS LAST), '[]'::jsonb) INTO _rows
  FROM (
    SELECT a.id, a.title, a.body, a.priority, a.category, a.cta_label, a.cta_url, a.publish_at, a.expires_at,
      EXISTS(SELECT 1 FROM public.vendor_announcement_reads r WHERE r.announcement_id = a.id AND r.vendor_id = _vendor) AS is_read
    FROM public.vendor_announcements a
    JOIN public.vendors v ON v.id = _vendor
    WHERE a.status = 'published'
      AND (a.publish_at IS NULL OR a.publish_at <= now())
      AND (a.expires_at IS NULL OR a.expires_at > now())
      AND (
        a.target_mode = 'all'
        OR (a.target_mode = 'kyc_verified' AND v.kyc_status = 'verified')
        OR (a.target_mode = 'specific' AND v.id = ANY(a.target_vendor_ids))
      )
  ) t;
  RETURN _rows;
END; $$;

CREATE OR REPLACE FUNCTION public.vendor_mark_announcement_read(_announcement_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vendor UUID;
BEGIN
  SELECT id INTO _vendor FROM public.vendors WHERE user_id = auth.uid() LIMIT 1;
  IF _vendor IS NULL THEN RETURN false; END IF;
  INSERT INTO public.vendor_announcement_reads(announcement_id, vendor_id)
  VALUES (_announcement_id, _vendor)
  ON CONFLICT (announcement_id, vendor_id) DO NOTHING;
  RETURN true;
END; $$;

-- =====================================================
-- BATCH 76: Order Note Templates
-- =====================================================
CREATE TABLE public.order_note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'internal' CHECK (category IN ('internal','customer','shipping','refund','fraud')),
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  use_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_note_templates_category ON public.order_note_templates(category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_note_templates TO authenticated;
GRANT ALL ON public.order_note_templates TO service_role;

ALTER TABLE public.order_note_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read templates" ON public.order_note_templates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND (is_shared OR created_by = auth.uid()));

CREATE POLICY "Admins create templates" ON public.order_note_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Owners update templates" ON public.order_note_templates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Owners delete templates" ON public.order_note_templates
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE TRIGGER trg_order_note_templates_updated_at
  BEFORE UPDATE ON public.order_note_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_order_note_template_use(_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.order_note_templates SET use_count = use_count + 1, last_used_at = now() WHERE id = _id;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_order_note_templates_stats()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'total_uses', COALESCE(SUM(use_count), 0),
    'shared', COUNT(*) FILTER (WHERE is_shared),
    'by_category', COALESCE(jsonb_object_agg(category, cnt) FILTER (WHERE category IS NOT NULL), '{}'::jsonb)
  ) INTO _r FROM (
    SELECT category, COUNT(*) AS cnt, SUM(use_count) AS use_count, bool_or(is_shared) AS is_shared
    FROM public.order_note_templates GROUP BY category
  ) x;
  RETURN _r;
END; $$;
