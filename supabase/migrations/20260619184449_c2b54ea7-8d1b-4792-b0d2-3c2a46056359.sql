
-- ============== BATCH H7: VENDOR SALES GOALS ==============
CREATE TABLE IF NOT EXISTS public.vendor_sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  target_revenue numeric(14,2) NOT NULL DEFAULT 0 CHECK (target_revenue >= 0),
  target_orders integer NOT NULL DEFAULT 0 CHECK (target_orders >= 0),
  target_rating numeric(3,2) DEFAULT NULL CHECK (target_rating IS NULL OR (target_rating >= 0 AND target_rating <= 5)),
  notes text,
  bonus_amount numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_sales_goals TO authenticated;
GRANT ALL ON public.vendor_sales_goals TO service_role;
ALTER TABLE public.vendor_sales_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vsg_select" ON public.vendor_sales_goals FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id=auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vsg_admin_write" ON public.vendor_sales_goals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_vsg_vendor_period ON public.vendor_sales_goals(vendor_id, period_month);

CREATE TRIGGER trg_vsg_updated_at BEFORE UPDATE ON public.vendor_sales_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.vendor_goal_progress(_vendor_id uuid, _month date DEFAULT NULL)
RETURNS TABLE(
  goal_id uuid, period_month date,
  target_revenue numeric, actual_revenue numeric, revenue_pct numeric,
  target_orders int, actual_orders int, orders_pct numeric,
  target_rating numeric, actual_rating numeric,
  bonus_amount numeric, is_achieved boolean
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE _m date := COALESCE(date_trunc('month', _month)::date, date_trunc('month', now())::date);
        _start timestamptz := _m;
        _end timestamptz := (_m + interval '1 month');
        _g record; _rev numeric; _ord int; _rat numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin')
     AND NOT EXISTS(SELECT 1 FROM public.vendors WHERE id=_vendor_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _g FROM public.vendor_sales_goals
    WHERE vendor_id=_vendor_id AND period_month=_m;

  SELECT COALESCE(SUM(total_amount),0), COUNT(*) INTO _rev, _ord
    FROM public.orders
    WHERE vendor_id=_vendor_id
      AND created_at >= _start AND created_at < _end
      AND status NOT IN ('cancelled','refunded');

  SELECT COALESCE(AVG(rating),0)::numeric(3,2) INTO _rat
    FROM public.reviews r JOIN public.products p ON p.id=r.product_id
    WHERE p.vendor_id=_vendor_id AND r.status='approved'
      AND r.created_at >= _start AND r.created_at < _end;

  RETURN QUERY SELECT
    _g.id, _m,
    COALESCE(_g.target_revenue, 0), _rev,
    CASE WHEN COALESCE(_g.target_revenue,0) > 0
         THEN round((_rev / _g.target_revenue) * 100, 2) ELSE 0 END,
    COALESCE(_g.target_orders, 0), _ord,
    CASE WHEN COALESCE(_g.target_orders,0) > 0
         THEN round((_ord::numeric / _g.target_orders) * 100, 2) ELSE 0 END,
    _g.target_rating, _rat,
    COALESCE(_g.bonus_amount, 0),
    (COALESCE(_g.target_revenue,0)=0 OR _rev >= _g.target_revenue)
      AND (COALESCE(_g.target_orders,0)=0 OR _ord >= _g.target_orders)
      AND (_g.target_rating IS NULL OR _rat >= _g.target_rating);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_vendor_goal_upsert(
  _id uuid, _vendor_id uuid, _period_month date,
  _target_revenue numeric, _target_orders int, _target_rating numeric,
  _bonus_amount numeric, _notes text, _is_active boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _out uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.vendor_sales_goals(vendor_id,period_month,target_revenue,target_orders,target_rating,bonus_amount,notes,is_active,created_by)
    VALUES (_vendor_id, date_trunc('month',_period_month)::date, _target_revenue, _target_orders, _target_rating, COALESCE(_bonus_amount,0), _notes, COALESCE(_is_active,true), auth.uid())
    ON CONFLICT (vendor_id, period_month) DO UPDATE
      SET target_revenue=EXCLUDED.target_revenue, target_orders=EXCLUDED.target_orders,
          target_rating=EXCLUDED.target_rating, bonus_amount=EXCLUDED.bonus_amount,
          notes=EXCLUDED.notes, is_active=EXCLUDED.is_active
    RETURNING id INTO _out;
  ELSE
    UPDATE public.vendor_sales_goals SET
      target_revenue=_target_revenue, target_orders=_target_orders, target_rating=_target_rating,
      bonus_amount=COALESCE(_bonus_amount,0), notes=_notes, is_active=COALESCE(_is_active,true)
    WHERE id=_id RETURNING id INTO _out;
  END IF;
  RETURN _out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_vendor_goal_delete(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.vendor_sales_goals WHERE id=_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_vendor_goals_list(_vendor_id uuid DEFAULT NULL)
RETURNS SETOF public.vendor_sales_goals LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.vendor_sales_goals
    WHERE (_vendor_id IS NULL OR vendor_id=_vendor_id)
    ORDER BY period_month DESC, created_at DESC;
END;
$$;

-- ============== BATCH H8: KNOWLEDGE BASE ==============
CREATE TABLE IF NOT EXISTS public.kb_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kb_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kb_categories TO authenticated;
GRANT ALL ON public.kb_categories TO service_role;
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kbc_public_read" ON public.kb_categories FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "kbc_admin_write" ON public.kb_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  body_md text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  view_count integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0,
  not_helpful_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  author_id uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kb_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kb_articles TO authenticated;
GRANT ALL ON public.kb_articles TO service_role;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kba_public_read" ON public.kb_articles FOR SELECT
  USING (status='published' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "kba_admin_write" ON public.kb_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_kba_status ON public.kb_articles(status);
CREATE INDEX IF NOT EXISTS idx_kba_category ON public.kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kba_tags ON public.kb_articles USING GIN(tags);

CREATE TRIGGER trg_kbc_updated_at BEFORE UPDATE ON public.kb_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_kba_updated_at BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.kb_search(_q text, _limit int DEFAULT 20)
RETURNS TABLE(id uuid, slug text, title text, excerpt text, category_slug text, tags text[], view_count int)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT a.id, a.slug, a.title, a.excerpt, c.slug, a.tags, a.view_count
    FROM public.kb_articles a
    LEFT JOIN public.kb_categories c ON c.id = a.category_id
   WHERE a.status='published'
     AND (
       _q IS NULL OR _q = '' OR
       a.title ILIKE '%'||_q||'%' OR
       a.excerpt ILIKE '%'||_q||'%' OR
       a.body_md ILIKE '%'||_q||'%' OR
       EXISTS (SELECT 1 FROM unnest(a.tags) t WHERE t ILIKE '%'||_q||'%')
     )
   ORDER BY a.sort_order ASC, a.view_count DESC
   LIMIT GREATEST(LEAST(_limit, 100), 1);
$$;

CREATE OR REPLACE FUNCTION public.kb_increment_view(_slug text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.kb_articles SET view_count = view_count + 1
   WHERE slug = _slug AND status='published';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.kb_vote(_slug text, _helpful boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _helpful THEN
    UPDATE public.kb_articles SET helpful_count = helpful_count + 1
     WHERE slug=_slug AND status='published';
  ELSE
    UPDATE public.kb_articles SET not_helpful_count = not_helpful_count + 1
     WHERE slug=_slug AND status='published';
  END IF;
  RETURN FOUND;
END;
$$;

-- Seed a starter category + article
INSERT INTO public.kb_categories(slug,name,description,icon,sort_order)
VALUES ('getting-started','Getting Started','New here? Start with these guides.','Sparkles',1)
ON CONFLICT (slug) DO NOTHING;
