
-- =====================================================
-- BATCH 77: Order Tags
-- =====================================================
CREATE TABLE public.order_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'default',
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.order_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, tag_id)
);

CREATE INDEX idx_order_tag_assignments_order ON public.order_tag_assignments(order_id);
CREATE INDEX idx_order_tag_assignments_tag ON public.order_tag_assignments(tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tags TO authenticated;
GRANT ALL ON public.order_tags TO service_role;
GRANT SELECT, INSERT, DELETE ON public.order_tag_assignments TO authenticated;
GRANT ALL ON public.order_tag_assignments TO service_role;

ALTER TABLE public.order_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage order tags" ON public.order_tags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors read order tags" ON public.order_tags
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage order tag assignments" ON public.order_tag_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors read assignments on own sub-orders" ON public.order_tag_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sub_orders so
    JOIN public.vendors v ON v.id = so.vendor_id
    WHERE so.order_id = order_tag_assignments.order_id AND v.user_id = auth.uid()
  ));

CREATE TRIGGER trg_order_tags_updated_at
  BEFORE UPDATE ON public.order_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_order_tags_list()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.usage_count DESC, t.label), '[]'::jsonb) INTO _r
  FROM (
    SELECT ot.*, (SELECT COUNT(*) FROM public.order_tag_assignments a WHERE a.tag_id = ot.id) AS usage_count
    FROM public.order_tags ot
  ) t;
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_order_tags_for(_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _r
  FROM (
    SELECT ot.id, ot.label, ot.color, a.assigned_at
    FROM public.order_tag_assignments a
    JOIN public.order_tags ot ON ot.id = a.tag_id
    WHERE a.order_id = _order_id
    ORDER BY a.assigned_at DESC
  ) t;
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_order_tag_assign(_order_id UUID, _tag_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.order_tag_assignments(order_id, tag_id, assigned_by)
  VALUES (_order_id, _tag_id, auth.uid())
  ON CONFLICT (order_id, tag_id) DO NOTHING;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_order_tag_remove(_order_id UUID, _tag_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.order_tag_assignments WHERE order_id = _order_id AND tag_id = _tag_id;
  RETURN FOUND;
END; $$;

-- =====================================================
-- BATCH 78: Vendor Dispatch Schedule
-- =====================================================
CREATE TABLE public.vendor_dispatch_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL UNIQUE REFERENCES public.vendors(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  -- Per weekday (0=Sun..6=Sat) cutoff hour (0-23) or NULL = no dispatch that day
  cutoff_hours JSONB NOT NULL DEFAULT '{"0":null,"1":17,"2":17,"3":17,"4":17,"5":17,"6":14}'::jsonb,
  lead_days INT NOT NULL DEFAULT 1 CHECK (lead_days BETWEEN 0 AND 30),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendor_dispatch_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, holiday_date)
);

CREATE INDEX idx_vendor_dispatch_holidays_vendor ON public.vendor_dispatch_holidays(vendor_id, holiday_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_dispatch_schedules TO authenticated;
GRANT ALL ON public.vendor_dispatch_schedules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_dispatch_holidays TO authenticated;
GRANT ALL ON public.vendor_dispatch_holidays TO service_role;

ALTER TABLE public.vendor_dispatch_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_dispatch_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dispatch schedules" ON public.vendor_dispatch_schedules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors manage own dispatch schedule" ON public.vendor_dispatch_schedules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));

CREATE POLICY "Public read dispatch schedule" ON public.vendor_dispatch_schedules
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage holidays" ON public.vendor_dispatch_holidays
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors manage own holidays" ON public.vendor_dispatch_holidays
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));

CREATE POLICY "Public read holidays" ON public.vendor_dispatch_holidays
  FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER trg_vendor_dispatch_schedules_updated_at
  BEFORE UPDATE ON public.vendor_dispatch_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Compute next dispatch date for a vendor given a placed-at timestamp
CREATE OR REPLACE FUNCTION public.vendor_compute_next_dispatch(_vendor_id UUID, _placed_at TIMESTAMPTZ DEFAULT now())
RETURNS DATE LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sched RECORD;
  _tz TEXT;
  _local TIMESTAMP;
  _cur DATE;
  _dow INT;
  _cutoff INT;
  _hit BOOLEAN;
  _i INT := 0;
BEGIN
  SELECT * INTO _sched FROM public.vendor_dispatch_schedules WHERE vendor_id = _vendor_id;
  IF _sched.id IS NULL THEN
    RETURN (_placed_at + (COALESCE((SELECT 1),1) || ' days')::interval)::date;
  END IF;
  _tz := COALESCE(_sched.timezone, 'Asia/Kolkata');
  _local := (_placed_at AT TIME ZONE _tz);
  _cur := _local::date;
  -- Determine starting candidate: today if before cutoff, else next day
  _dow := EXTRACT(DOW FROM _local)::int;
  _cutoff := NULLIF(_sched.cutoff_hours->>_dow::text, '')::int;
  IF _cutoff IS NULL OR EXTRACT(HOUR FROM _local)::int >= _cutoff THEN
    _cur := _cur + 1;
  END IF;
  -- Walk forward up to 60 days respecting cutoff_hours + holidays + lead_days
  WHILE _i < 60 LOOP
    _dow := EXTRACT(DOW FROM _cur)::int;
    _cutoff := NULLIF(_sched.cutoff_hours->>_dow::text, '')::int;
    _hit := EXISTS (SELECT 1 FROM public.vendor_dispatch_holidays WHERE vendor_id = _vendor_id AND holiday_date = _cur);
    IF _cutoff IS NOT NULL AND NOT _hit THEN
      RETURN _cur + (_sched.lead_days || ' days')::interval;
    END IF;
    _cur := _cur + 1;
    _i := _i + 1;
  END LOOP;
  RETURN _cur;
END; $$;

CREATE OR REPLACE FUNCTION public.vendor_dispatch_schedule_get(_vendor_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r JSONB;
BEGIN
  SELECT jsonb_build_object(
    'schedule', (SELECT row_to_json(s) FROM public.vendor_dispatch_schedules s WHERE s.vendor_id = _vendor_id),
    'holidays', COALESCE((SELECT jsonb_agg(row_to_json(h) ORDER BY h.holiday_date)
      FROM public.vendor_dispatch_holidays h WHERE h.vendor_id = _vendor_id), '[]'::jsonb),
    'next_dispatch', public.vendor_compute_next_dispatch(_vendor_id)
  ) INTO _r;
  RETURN _r;
END; $$;
