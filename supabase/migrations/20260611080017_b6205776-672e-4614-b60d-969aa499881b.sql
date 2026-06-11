
-- =========================================================
-- BATCH 69: Customer Tags
-- =========================================================
CREATE TABLE public.customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE CHECK (char_length(label) BETWEEN 2 AND 40),
  color text NOT NULL DEFAULT 'default' CHECK (color IN ('default','secondary','destructive','outline')),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tag_id, customer_id)
);
CREATE INDEX idx_cta_customer ON public.customer_tag_assignments(customer_id);
CREATE INDEX idx_cta_tag ON public.customer_tag_assignments(tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_tag_assignments TO authenticated;
GRANT ALL ON public.customer_tags, public.customer_tag_assignments TO service_role;

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctags_select" ON public.customer_tags FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(),'view_customers'));
CREATE POLICY "ctags_manage" ON public.customer_tags FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(),'manage_customers'))
  WITH CHECK (public.admin_has_permission(auth.uid(),'manage_customers'));

CREATE POLICY "cta_select" ON public.customer_tag_assignments FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(),'view_customers'));
CREATE POLICY "cta_manage" ON public.customer_tag_assignments FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(),'manage_customers'))
  WITH CHECK (public.admin_has_permission(auth.uid(),'manage_customers') AND assigned_by = auth.uid());

CREATE TRIGGER trg_ctags_updated BEFORE UPDATE ON public.customer_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_customer_tags_list()
RETURNS TABLE (id uuid, label text, color text, description text, usage_count bigint, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_customers') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT t.id, t.label, t.color, t.description,
         COUNT(a.id) AS usage_count, t.created_at
  FROM public.customer_tags t
  LEFT JOIN public.customer_tag_assignments a ON a.tag_id = t.id
  GROUP BY t.id ORDER BY t.label;
END $$;

CREATE OR REPLACE FUNCTION public.admin_customer_tags_for(_customer_id uuid)
RETURNS TABLE (assignment_id uuid, tag_id uuid, label text, color text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_customers') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT a.id, t.id, t.label, t.color, a.created_at
  FROM public.customer_tag_assignments a
  JOIN public.customer_tags t ON t.id = a.tag_id
  WHERE a.customer_id = _customer_id
  ORDER BY t.label;
END $$;

CREATE OR REPLACE FUNCTION public.admin_customer_tag_assign(_customer_id uuid, _tag_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_customers') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.customer_tag_assignments(tag_id, customer_id, assigned_by)
  VALUES (_tag_id, _customer_id, auth.uid())
  ON CONFLICT (tag_id, customer_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_customer_tag_remove(_assignment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_customers') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.customer_tag_assignments WHERE id = _assignment_id;
END $$;

-- =========================================================
-- BATCH 70: Order SLA Breach Tracker
-- =========================================================
CREATE TABLE public.order_sla_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  breach_type text NOT NULL DEFAULT 'fulfillment' CHECK (breach_type IN ('fulfillment','shipping','delivery','response')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  hours_overdue numeric NOT NULL DEFAULT 0,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  assigned_to uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 1000),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_osb_open ON public.order_sla_breaches(detected_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_osb_assigned ON public.order_sla_breaches(assigned_to) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_sla_breaches TO authenticated;
GRANT ALL ON public.order_sla_breaches TO service_role;
ALTER TABLE public.order_sla_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "osb_select" ON public.order_sla_breaches FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(),'view_orders'));
CREATE POLICY "osb_manage" ON public.order_sla_breaches FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(),'manage_orders'))
  WITH CHECK (public.admin_has_permission(auth.uid(),'manage_orders'));

CREATE TRIGGER trg_osb_updated BEFORE UPDATE ON public.order_sla_breaches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-detect: orders still 'pending'/'processing' past 48h (fulfillment) / 96h (shipping)
CREATE OR REPLACE FUNCTION public.detect_order_sla_breaches()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted int := 0; updated int := 0;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_orders') THEN RAISE EXCEPTION 'forbidden'; END IF;

  WITH candidates AS (
    SELECT o.id AS order_id,
           CASE WHEN o.status IN ('pending','processing') THEN 'fulfillment'
                WHEN o.status = 'shipped' THEN 'shipping'
                ELSE 'fulfillment' END AS breach_type,
           EXTRACT(EPOCH FROM (now() - o.created_at))/3600.0 AS hrs
    FROM public.orders o
    WHERE o.status IN ('pending','processing','shipped')
      AND (
        (o.status IN ('pending','processing') AND o.created_at < now() - interval '48 hours')
        OR (o.status = 'shipped' AND o.created_at < now() - interval '96 hours')
      )
  ),
  ins AS (
    INSERT INTO public.order_sla_breaches(order_id, breach_type, hours_overdue, severity)
    SELECT order_id, breach_type, hrs,
           CASE WHEN hrs > 168 THEN 'critical'
                WHEN hrs > 96 THEN 'high'
                WHEN hrs > 72 THEN 'medium'
                ELSE 'low' END
    FROM candidates
    ON CONFLICT (order_id) DO UPDATE
       SET hours_overdue = EXCLUDED.hours_overdue,
           severity = EXCLUDED.severity,
           updated_at = now()
    RETURNING xmax = 0 AS is_insert
  )
  SELECT
    COUNT(*) FILTER (WHERE is_insert),
    COUNT(*) FILTER (WHERE NOT is_insert)
  INTO inserted, updated FROM ins;

  RETURN jsonb_build_object('inserted', inserted, 'updated', updated, 'detected_at', now());
END $$;

CREATE OR REPLACE FUNCTION public.admin_sla_breaches_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_orders') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'open_total', COUNT(*) FILTER (WHERE resolved_at IS NULL),
    'critical', COUNT(*) FILTER (WHERE resolved_at IS NULL AND severity='critical'),
    'high', COUNT(*) FILTER (WHERE resolved_at IS NULL AND severity='high'),
    'unacknowledged', COUNT(*) FILTER (WHERE resolved_at IS NULL AND acknowledged_at IS NULL),
    'assigned_to_me', COUNT(*) FILTER (WHERE resolved_at IS NULL AND assigned_to = auth.uid()),
    'resolved_24h', COUNT(*) FILTER (WHERE resolved_at > now() - interval '24 hours')
  ) INTO r FROM public.order_sla_breaches;
  RETURN COALESCE(r,'{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_sla_breaches_list(_status text DEFAULT 'open', _limit int DEFAULT 200)
RETURNS TABLE (
  id uuid, order_id uuid, order_number text, order_status text, order_total numeric,
  breach_type text, severity text, hours_overdue numeric,
  detected_at timestamptz, acknowledged_at timestamptz, assigned_to uuid,
  resolved_at timestamptz, resolution_note text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_orders') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT b.id, b.order_id, o.order_number, o.status::text, o.total_amount,
         b.breach_type, b.severity, b.hours_overdue,
         b.detected_at, b.acknowledged_at, b.assigned_to,
         b.resolved_at, b.resolution_note
  FROM public.order_sla_breaches b
  LEFT JOIN public.orders o ON o.id = b.order_id
  WHERE (_status = 'all')
     OR (_status = 'open' AND b.resolved_at IS NULL)
     OR (_status = 'unacknowledged' AND b.resolved_at IS NULL AND b.acknowledged_at IS NULL)
     OR (_status = 'resolved' AND b.resolved_at IS NOT NULL)
  ORDER BY (b.resolved_at IS NULL) DESC, b.severity DESC, b.hours_overdue DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
END $$;

CREATE OR REPLACE FUNCTION public.admin_sla_breach_acknowledge(_id uuid, _assign_to_me boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_orders') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.order_sla_breaches
     SET acknowledged_by = auth.uid(),
         acknowledged_at = COALESCE(acknowledged_at, now()),
         assigned_to = CASE WHEN _assign_to_me THEN auth.uid() ELSE assigned_to END
   WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_sla_breach_resolve(_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_orders') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.order_sla_breaches
     SET resolved_by = auth.uid(), resolved_at = now(), resolution_note = _note
   WHERE id = _id AND resolved_at IS NULL;
END $$;
