
-- ============================================================
-- BATCH 65: ADMIN CUSTOMER NOTES
-- ============================================================
CREATE TABLE public.admin_customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','billing','fraud','support','vip')),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_acn_customer ON public.admin_customer_notes(customer_id, is_pinned DESC, created_at DESC);
CREATE INDEX idx_acn_category ON public.admin_customer_notes(category) WHERE is_archived = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_customer_notes TO authenticated;
GRANT ALL ON public.admin_customer_notes TO service_role;
ALTER TABLE public.admin_customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read customer notes" ON public.admin_customer_notes FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_customers'));
CREATE POLICY "Admins create customer notes" ON public.admin_customer_notes FOR INSERT TO authenticated
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_customers') AND author_id = auth.uid());
CREATE POLICY "Authors update own notes" ON public.admin_customer_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.admin_has_permission(auth.uid(), 'manage_admins'))
  WITH CHECK (author_id = auth.uid() OR public.admin_has_permission(auth.uid(), 'manage_admins'));
CREATE POLICY "Authors or super delete notes" ON public.admin_customer_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE TRIGGER trg_acn_updated BEFORE UPDATE ON public.admin_customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_customer_notes_list(_customer_id UUID, _include_archived BOOLEAN DEFAULT false)
RETURNS TABLE(
  id UUID, customer_id UUID, author_id UUID, author_email TEXT,
  category TEXT, body TEXT, is_pinned BOOLEAN, is_archived BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_customers') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT n.id, n.customer_id, n.author_id, u.email::TEXT,
         n.category, n.body, n.is_pinned, n.is_archived,
         n.created_at, n.updated_at
  FROM public.admin_customer_notes n
  LEFT JOIN auth.users u ON u.id = n.author_id
  WHERE n.customer_id = _customer_id
    AND (_include_archived OR n.is_archived = false)
  ORDER BY n.is_pinned DESC, n.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_customer_notes_stats(_customer_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_customers') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN (SELECT jsonb_build_object(
    'total', COUNT(*),
    'pinned', COUNT(*) FILTER (WHERE is_pinned),
    'fraud', COUNT(*) FILTER (WHERE category='fraud'),
    'vip', COUNT(*) FILTER (WHERE category='vip'),
    'last_note_at', MAX(created_at)
  ) FROM public.admin_customer_notes WHERE customer_id = _customer_id AND is_archived = false);
END;
$$;

-- ============================================================
-- BATCH 66: ORDER WATCHLIST
-- ============================================================
CREATE TABLE public.admin_order_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, order_id)
);
CREATE INDEX idx_aow_admin ON public.admin_order_watchlist(admin_user_id, resolved_at NULLS FIRST, severity DESC);
CREATE INDEX idx_aow_open_severity ON public.admin_order_watchlist(severity, due_at) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_order_watchlist TO authenticated;
GRANT ALL ON public.admin_order_watchlist TO service_role;
ALTER TABLE public.admin_order_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own watchlist" ON public.admin_order_watchlist FOR ALL TO authenticated
  USING (admin_user_id = auth.uid() AND public.admin_has_permission(auth.uid(), 'view_orders'))
  WITH CHECK (admin_user_id = auth.uid() AND public.admin_has_permission(auth.uid(), 'view_orders'));
CREATE POLICY "Super admins view all watchlists" ON public.admin_order_watchlist FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE TRIGGER trg_aow_updated BEFORE UPDATE ON public.admin_order_watchlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_watchlist_list(_status TEXT DEFAULT 'open', _limit INT DEFAULT 100)
RETURNS TABLE(
  id UUID, order_id UUID, reason TEXT, severity TEXT,
  due_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ,
  order_number TEXT, order_status TEXT, order_total NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_orders') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT w.id, w.order_id, w.reason, w.severity, w.due_at, w.resolved_at, w.created_at,
         o.order_number, o.status::TEXT, o.total_amount
  FROM public.admin_order_watchlist w
  LEFT JOIN public.orders o ON o.id = w.order_id
  WHERE w.admin_user_id = auth.uid()
    AND ( _status = 'all'
       OR (_status = 'open' AND w.resolved_at IS NULL)
       OR (_status = 'resolved' AND w.resolved_at IS NOT NULL)
       OR (_status = 'overdue' AND w.resolved_at IS NULL AND w.due_at IS NOT NULL AND w.due_at < now()))
  ORDER BY (w.resolved_at IS NULL) DESC,
           CASE w.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           w.created_at DESC
  LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_watchlist_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_orders') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN (SELECT jsonb_build_object(
    'mine_open', COUNT(*) FILTER (WHERE admin_user_id = auth.uid() AND resolved_at IS NULL),
    'mine_overdue', COUNT(*) FILTER (WHERE admin_user_id = auth.uid() AND resolved_at IS NULL AND due_at IS NOT NULL AND due_at < now()),
    'mine_high', COUNT(*) FILTER (WHERE admin_user_id = auth.uid() AND resolved_at IS NULL AND severity = 'high'),
    'mine_resolved_7d', COUNT(*) FILTER (WHERE admin_user_id = auth.uid() AND resolved_at > now() - INTERVAL '7 days')
  ) FROM public.admin_order_watchlist);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_watchlist_add(_order_id UUID, _reason TEXT, _severity TEXT DEFAULT 'medium', _due_at TIMESTAMPTZ DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_orders') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _severity NOT IN ('low','medium','high') THEN RAISE EXCEPTION 'invalid severity'; END IF;
  INSERT INTO public.admin_order_watchlist(admin_user_id, order_id, reason, severity, due_at)
  VALUES (auth.uid(), _order_id, _reason, _severity, _due_at)
  ON CONFLICT (admin_user_id, order_id) DO UPDATE
    SET reason = EXCLUDED.reason, severity = EXCLUDED.severity,
        due_at = EXCLUDED.due_at, resolved_at = NULL, resolution_note = NULL
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_watchlist_resolve(_id UUID, _note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.admin_order_watchlist
  SET resolved_at = now(), resolution_note = _note
  WHERE id = _id AND admin_user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_watchlist_remove(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.admin_order_watchlist WHERE id = _id AND admin_user_id = auth.uid();
END;
$$;
