
-- ============================================================
-- ENTERPRISE ABANDONED CART RECOVERY SYSTEM
-- ============================================================

-- 1. A/B Test Variants for cart recovery emails
CREATE TABLE public.cart_recovery_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  traffic_split INTEGER NOT NULL DEFAULT 50, -- % going to variant A
  variant_a JSONB NOT NULL DEFAULT '{}', -- {subject, discount_type, discount_value, template_style}
  variant_b JSONB NOT NULL DEFAULT '{}',
  total_sent_a INTEGER NOT NULL DEFAULT 0,
  total_sent_b INTEGER NOT NULL DEFAULT 0,
  recovered_a INTEGER NOT NULL DEFAULT 0,
  recovered_b INTEGER NOT NULL DEFAULT 0,
  revenue_a NUMERIC NOT NULL DEFAULT 0,
  revenue_b NUMERIC NOT NULL DEFAULT 0,
  winner TEXT, -- 'a', 'b', or null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cart_recovery_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cart recovery AB tests" ON public.cart_recovery_ab_tests
  FOR ALL USING (public.is_admin(auth.uid()));

-- 2. Enhanced cart_abandonment_events with product-level & channel tracking
ALTER TABLE public.cart_abandonment_events
  ADD COLUMN IF NOT EXISTS recovery_channel TEXT, -- 'email', 'whatsapp', 'exit_popup', 'push'
  ADD COLUMN IF NOT EXISTS recovery_discount_code TEXT,
  ADD COLUMN IF NOT EXISTS recovery_discount_value NUMERIC,
  ADD COLUMN IF NOT EXISTS ab_test_id UUID REFERENCES public.cart_recovery_ab_tests(id),
  ADD COLUMN IF NOT EXISTS ab_variant TEXT, -- 'a' or 'b'
  ADD COLUMN IF NOT EXISTS cart_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovered_revenue NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_segment TEXT, -- 'new', 'returning', 'high_value', 'at_risk'
  ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_popup_shown BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exit_popup_converted BOOLEAN DEFAULT false;

-- 3. Dynamic discount rules for cart recovery
CREATE TABLE public.cart_recovery_discount_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  -- Conditions
  min_cart_value NUMERIC DEFAULT 0,
  max_cart_value NUMERIC,
  user_segments TEXT[] DEFAULT '{}', -- ['new', 'returning', 'high_value', 'at_risk']
  email_step INTEGER, -- which step triggers this discount (1, 2, or 3)
  -- Discount
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value NUMERIC NOT NULL DEFAULT 5,
  max_discount NUMERIC, -- cap for percentage discounts
  -- Escalation: auto-increase discount on subsequent steps
  escalation_enabled BOOLEAN DEFAULT false,
  escalation_step_2_value NUMERIC,
  escalation_step_3_value NUMERIC,
  -- Tracking
  times_used INTEGER NOT NULL DEFAULT 0,
  total_revenue_recovered NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cart_recovery_discount_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discount rules" ON public.cart_recovery_discount_rules
  FOR ALL USING (public.is_admin(auth.uid()));

-- 4. Product-level abandonment analytics (materialized via trigger)
CREATE TABLE public.product_abandonment_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  times_abandoned INTEGER NOT NULL DEFAULT 0,
  times_recovered INTEGER NOT NULL DEFAULT 0,
  recovery_rate NUMERIC NOT NULL DEFAULT 0,
  lost_revenue NUMERIC NOT NULL DEFAULT 0,
  recovered_revenue NUMERIC NOT NULL DEFAULT 0,
  avg_cart_value NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, period_start, period_end)
);
ALTER TABLE public.product_abandonment_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read product abandonment stats" ON public.product_abandonment_stats
  FOR SELECT USING (public.is_admin(auth.uid()));

-- 5. Function to compute product-level stats
CREATE OR REPLACE FUNCTION public.compute_product_abandonment_stats(
  p_period_start DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_period_end DATE DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prod RECORD;
  abandoned_count INTEGER;
  recovered_count INTEGER;
  lost_rev NUMERIC;
  recovered_rev NUMERIC;
  avg_val NUMERIC;
BEGIN
  -- Get all products that appear in cart snapshots during this period
  FOR prod IN 
    SELECT DISTINCT unnest(product_ids) as pid
    FROM cart_abandonment_events
    WHERE created_at >= p_period_start
      AND created_at < p_period_end + INTERVAL '1 day'
      AND product_ids IS NOT NULL
      AND array_length(product_ids, 1) > 0
  LOOP
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE recovered = true),
      COALESCE(SUM(cart_value) FILTER (WHERE recovered = false), 0),
      COALESCE(SUM(recovered_revenue) FILTER (WHERE recovered = true), 0),
      COALESCE(AVG(cart_value), 0)
    INTO abandoned_count, recovered_count, lost_rev, recovered_rev, avg_val
    FROM cart_abandonment_events
    WHERE prod.pid = ANY(product_ids)
      AND created_at >= p_period_start
      AND created_at < p_period_end + INTERVAL '1 day';

    INSERT INTO product_abandonment_stats (
      product_id, period_start, period_end,
      times_abandoned, times_recovered, recovery_rate,
      lost_revenue, recovered_revenue, avg_cart_value, updated_at
    ) VALUES (
      prod.pid::uuid, p_period_start, p_period_end,
      abandoned_count, recovered_count,
      CASE WHEN abandoned_count > 0 THEN (recovered_count::numeric / abandoned_count) * 100 ELSE 0 END,
      lost_rev, recovered_rev, avg_val, now()
    )
    ON CONFLICT (product_id, period_start, period_end)
    DO UPDATE SET
      times_abandoned = EXCLUDED.times_abandoned,
      times_recovered = EXCLUDED.times_recovered,
      recovery_rate = EXCLUDED.recovery_rate,
      lost_revenue = EXCLUDED.lost_revenue,
      recovered_revenue = EXCLUDED.recovered_revenue,
      avg_cart_value = EXCLUDED.avg_cart_value,
      updated_at = now();
  END LOOP;
END;
$$;

-- 6. Function to get dynamic discount for a user's abandoned cart
CREATE OR REPLACE FUNCTION public.get_cart_recovery_discount(
  p_user_id UUID,
  p_cart_value NUMERIC,
  p_email_step INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rule RECORD;
  user_seg TEXT;
  discount_val NUMERIC;
  discount_code TEXT;
  result JSONB;
BEGIN
  -- Determine user segment
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 'new'
    WHEN SUM(total_amount) >= 10000 THEN 'high_value'
    WHEN MAX(created_at) < now() - INTERVAL '60 days' THEN 'at_risk'
    ELSE 'returning'
  END INTO user_seg
  FROM orders
  WHERE customer_id = p_user_id AND payment_status IN ('paid', 'cod_pending');

  -- Find best matching rule
  FOR rule IN
    SELECT * FROM cart_recovery_discount_rules
    WHERE is_active = true
      AND (min_cart_value IS NULL OR p_cart_value >= min_cart_value)
      AND (max_cart_value IS NULL OR p_cart_value <= max_cart_value)
      AND (user_segments = '{}' OR user_seg = ANY(user_segments))
      AND (email_step IS NULL OR email_step = p_email_step)
    ORDER BY priority DESC, discount_value DESC
    LIMIT 1
  LOOP
    -- Apply escalation if enabled
    IF rule.escalation_enabled THEN
      IF p_email_step = 3 AND rule.escalation_step_3_value IS NOT NULL THEN
        discount_val := rule.escalation_step_3_value;
      ELSIF p_email_step = 2 AND rule.escalation_step_2_value IS NOT NULL THEN
        discount_val := rule.escalation_step_2_value;
      ELSE
        discount_val := rule.discount_value;
      END IF;
    ELSE
      discount_val := rule.discount_value;
    END IF;

    -- Cap discount
    IF rule.discount_type = 'percentage' AND rule.max_discount IS NOT NULL THEN
      discount_val := LEAST(discount_val, rule.max_discount);
    END IF;

    -- Generate unique discount code
    discount_code := 'CART' || upper(substring(md5(random()::text || now()::text) from 1 for 6));

    result := jsonb_build_object(
      'rule_id', rule.id,
      'discount_type', rule.discount_type,
      'discount_value', discount_val,
      'discount_code', discount_code,
      'user_segment', user_seg,
      'max_discount', rule.max_discount
    );
    RETURN result;
  END LOOP;

  -- No matching rule
  RETURN jsonb_build_object('discount_type', 'none', 'discount_value', 0, 'user_segment', user_seg);
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_cart_recovery_ab_tests_updated_at
  BEFORE UPDATE ON public.cart_recovery_ab_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_recovery_discount_rules_updated_at
  BEFORE UPDATE ON public.cart_recovery_discount_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
