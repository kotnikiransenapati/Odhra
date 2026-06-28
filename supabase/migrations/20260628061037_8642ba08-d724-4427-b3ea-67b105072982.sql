
-- ============ 1. Segment auto-refresh RPC ============
CREATE OR REPLACE FUNCTION public.refresh_customer_segments()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seg RECORD;
  v_total INT := 0;
  v_processed INT := 0;
  v_criteria JSONB;
  v_min_orders INT;
  v_max_orders INT;
  v_min_spent NUMERIC;
  v_max_spent NUMERIC;
  v_last_active_days INT;
BEGIN
  FOR seg IN
    SELECT id, criteria FROM public.customer_segments
    WHERE is_active = TRUE AND segment_type IN ('dynamic','auto','rule')
  LOOP
    v_criteria := seg.criteria;
    v_min_orders := NULLIF(v_criteria->>'min_orders','')::INT;
    v_max_orders := NULLIF(v_criteria->>'max_orders','')::INT;
    v_min_spent  := NULLIF(v_criteria->>'min_spent','')::NUMERIC;
    v_max_spent  := NULLIF(v_criteria->>'max_spent','')::NUMERIC;
    v_last_active_days := NULLIF(v_criteria->>'last_active_days','')::INT;

    DELETE FROM public.customer_segment_members WHERE segment_id = seg.id;

    WITH stats AS (
      SELECT
        customer_id AS uid,
        COUNT(*) FILTER (WHERE payment_status::text = 'paid') AS orders_count,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status::text = 'paid'), 0) AS total_spent,
        MAX(created_at) AS last_order_at
      FROM public.orders
      WHERE customer_id IS NOT NULL
      GROUP BY customer_id
    ),
    matched AS (
      SELECT uid FROM stats
      WHERE (v_min_orders IS NULL OR orders_count >= v_min_orders)
        AND (v_max_orders IS NULL OR orders_count <= v_max_orders)
        AND (v_min_spent  IS NULL OR total_spent  >= v_min_spent)
        AND (v_max_spent  IS NULL OR total_spent  <= v_max_spent)
        AND (v_last_active_days IS NULL OR last_order_at >= NOW() - (v_last_active_days || ' days')::INTERVAL)
    )
    INSERT INTO public.customer_segment_members (segment_id, user_id)
    SELECT seg.id, uid FROM matched
    ON CONFLICT DO NOTHING;

    UPDATE public.customer_segments
       SET member_count = (SELECT COUNT(*) FROM public.customer_segment_members WHERE segment_id = seg.id),
           last_refreshed_at = NOW()
     WHERE id = seg.id;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object('segments_refreshed', v_processed, 'ts', NOW());
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_customer_segments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_customer_segments() TO service_role;

-- ============ 2. Lifecycle Journeys ============
CREATE TABLE IF NOT EXISTS public.lifecycle_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('segment_entry','signup','first_purchase','abandoned_cart','inactive','manual')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  throttle_per_user_days INT NOT NULL DEFAULT 30,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_journeys TO authenticated;
GRANT ALL ON public.lifecycle_journeys TO service_role;
ALTER TABLE public.lifecycle_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage journeys" ON public.lifecycle_journeys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.journey_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.lifecycle_journeys(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('wait','send_email','send_notification','grant_discount','tag_segment','webhook')),
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  wait_hours INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (journey_id, step_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_steps TO authenticated;
GRANT ALL ON public.journey_steps TO service_role;
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage journey steps" ON public.journey_steps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.journey_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.lifecycle_journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','exited','failed')),
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (journey_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_journey_enroll_next_run ON public.journey_enrollments(next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_journey_enroll_user ON public.journey_enrollments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_enrollments TO authenticated;
GRANT ALL ON public.journey_enrollments TO service_role;
ALTER TABLE public.journey_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view all enrollments" ON public.journey_enrollments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "users view own enrollments" ON public.journey_enrollments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage enrollments" ON public.journey_enrollments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.journey_enrollments(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','skipped','failed')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journey_events_enroll ON public.journey_events(enrollment_id);
GRANT SELECT, INSERT ON public.journey_events TO authenticated;
GRANT ALL ON public.journey_events TO service_role;
ALTER TABLE public.journey_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read journey events" ON public.journey_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_lifecycle_journeys()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_touch_lifecycle_journeys ON public.lifecycle_journeys;
CREATE TRIGGER trg_touch_lifecycle_journeys BEFORE UPDATE ON public.lifecycle_journeys
  FOR EACH ROW EXECUTE FUNCTION public.touch_lifecycle_journeys();

-- ============ 3. Enrollment helper RPC (used by triggers/edge fn) ============
CREATE OR REPLACE FUNCTION public.enroll_user_in_journey(_journey_id UUID, _user_id UUID, _context JSONB DEFAULT '{}'::jsonb)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_throttle INT;
  v_recent BOOLEAN;
BEGIN
  SELECT throttle_per_user_days INTO v_throttle FROM public.lifecycle_journeys WHERE id = _journey_id AND status = 'active';
  IF v_throttle IS NULL THEN RETURN NULL; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.journey_enrollments
    WHERE journey_id = _journey_id AND user_id = _user_id
      AND enrolled_at > NOW() - (v_throttle || ' days')::INTERVAL
  ) INTO v_recent;
  IF v_recent THEN RETURN NULL; END IF;

  INSERT INTO public.journey_enrollments (journey_id, user_id, context, next_run_at)
  VALUES (_journey_id, _user_id, COALESCE(_context,'{}'::jsonb), NOW())
  ON CONFLICT (journey_id, user_id) DO UPDATE SET
    status = 'active', current_step = 0, next_run_at = NOW(),
    enrolled_at = NOW(), completed_at = NULL, context = EXCLUDED.context
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enroll_user_in_journey(UUID,UUID,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enroll_user_in_journey(UUID,UUID,JSONB) TO service_role, authenticated;
