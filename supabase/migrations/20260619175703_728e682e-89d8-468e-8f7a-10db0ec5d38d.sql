
-- =====================================================
-- BATCH 73: Order Hold Reasons (Admin-driven order holds)
-- =====================================================
CREATE TABLE public.order_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reason_code TEXT NOT NULL CHECK (reason_code IN (
    'fraud_review','payment_issue','address_verification','stock_issue',
    'customer_request','manual_review','compliance_check','other'
  )),
  reason_notes TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','expired')),
  placed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  released_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  released_at TIMESTAMPTZ,
  release_notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_holds_order ON public.order_holds(order_id);
CREATE INDEX idx_order_holds_status ON public.order_holds(status) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_holds TO authenticated;
GRANT ALL ON public.order_holds TO service_role;
ALTER TABLE public.order_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage order holds" ON public.order_holds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access order_holds" ON public.order_holds
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_order_holds_updated_at
  BEFORE UPDATE ON public.order_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stats RPC
CREATE OR REPLACE FUNCTION public.admin_order_holds_stats()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT jsonb_build_object(
    'active', COUNT(*) FILTER (WHERE status='active'),
    'critical', COUNT(*) FILTER (WHERE status='active' AND severity='critical'),
    'released_24h', COUNT(*) FILTER (WHERE status='released' AND released_at >= now() - interval '24 hours'),
    'total_active_value', COALESCE(SUM(o.total) FILTER (WHERE oh.status='active'), 0)
  ) INTO _result
  FROM public.order_holds oh
  LEFT JOIN public.orders o ON o.id = oh.order_id;
  RETURN _result;
END; $$;

-- List RPC
CREATE OR REPLACE FUNCTION public.admin_order_holds_list(
  _status TEXT DEFAULT 'active',
  _limit INT DEFAULT 50,
  _offset INT DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _rows JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _rows FROM (
    SELECT oh.*, o.order_number, o.total AS order_total, o.status AS order_status
    FROM public.order_holds oh
    LEFT JOIN public.orders o ON o.id = oh.order_id
    WHERE (_status IS NULL OR oh.status = _status)
    ORDER BY 
      CASE oh.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      oh.created_at DESC
    LIMIT _limit OFFSET _offset
  ) t;
  RETURN _rows;
END; $$;

-- Place hold
CREATE OR REPLACE FUNCTION public.admin_order_hold_place(
  _order_id UUID,
  _reason_code TEXT,
  _severity TEXT,
  _notes TEXT DEFAULT NULL,
  _expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.order_holds(order_id, reason_code, reason_notes, severity, placed_by, expires_at)
  VALUES (_order_id, _reason_code, _notes, COALESCE(_severity,'medium'), auth.uid(), _expires_at)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- Release hold
CREATE OR REPLACE FUNCTION public.admin_order_hold_release(
  _hold_id UUID,
  _release_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.order_holds
  SET status = 'released', released_by = auth.uid(), released_at = now(), release_notes = _release_notes
  WHERE id = _hold_id AND status = 'active';
  RETURN FOUND;
END; $$;

-- =====================================================
-- BATCH 74: Admin Saved Filter Views
-- =====================================================
CREATE TABLE public.admin_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  use_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_saved_views_scope ON public.admin_saved_views(scope);
CREATE INDEX idx_admin_saved_views_admin ON public.admin_saved_views(admin_id);
CREATE UNIQUE INDEX uq_admin_saved_views_name ON public.admin_saved_views(admin_id, scope, name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_saved_views TO authenticated;
GRANT ALL ON public.admin_saved_views TO service_role;
ALTER TABLE public.admin_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own saved views" ON public.admin_saved_views
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND (admin_id = auth.uid() OR is_shared))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE POLICY "Service role full access admin_saved_views" ON public.admin_saved_views
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_admin_saved_views_updated_at
  BEFORE UPDATE ON public.admin_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- List for scope
CREATE OR REPLACE FUNCTION public.admin_saved_views_list(_scope TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _rows JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.pinned DESC, t.use_count DESC), '[]'::jsonb) INTO _rows
  FROM (
    SELECT * FROM public.admin_saved_views
    WHERE scope = _scope AND (admin_id = auth.uid() OR is_shared)
  ) t;
  RETURN _rows;
END; $$;

-- Save (upsert)
CREATE OR REPLACE FUNCTION public.admin_saved_view_save(
  _scope TEXT,
  _name TEXT,
  _filters JSONB,
  _sort JSONB DEFAULT '{}'::jsonb,
  _columns JSONB DEFAULT '[]'::jsonb,
  _description TEXT DEFAULT NULL,
  _is_shared BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.admin_saved_views(admin_id, scope, name, description, filters, sort_config, columns, is_shared)
  VALUES (auth.uid(), _scope, _name, _description, COALESCE(_filters,'{}'::jsonb), COALESCE(_sort,'{}'::jsonb), COALESCE(_columns,'[]'::jsonb), COALESCE(_is_shared,false))
  ON CONFLICT (admin_id, scope, name) DO UPDATE
    SET filters = EXCLUDED.filters,
        sort_config = EXCLUDED.sort_config,
        columns = EXCLUDED.columns,
        description = EXCLUDED.description,
        is_shared = EXCLUDED.is_shared,
        updated_at = now()
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- Delete
CREATE OR REPLACE FUNCTION public.admin_saved_view_delete(_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  DELETE FROM public.admin_saved_views WHERE id = _id AND admin_id = auth.uid();
  RETURN FOUND;
END; $$;

-- Apply (track usage)
CREATE OR REPLACE FUNCTION public.admin_saved_view_apply(_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.admin_saved_views
  SET use_count = use_count + 1, last_used_at = now()
  WHERE id = _id AND (admin_id = auth.uid() OR is_shared);
  RETURN FOUND;
END; $$;

-- Toggle pin
CREATE OR REPLACE FUNCTION public.admin_saved_view_toggle_pin(_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.admin_saved_views SET pinned = NOT pinned WHERE id = _id AND admin_id = auth.uid();
  RETURN FOUND;
END; $$;
