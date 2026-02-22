
-- Create vendor_performance_metrics table for scoring
CREATE TABLE IF NOT EXISTS public.vendor_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  on_time_delivery_rate NUMERIC DEFAULT 0,
  cancellation_rate NUMERIC DEFAULT 0,
  return_rate NUMERIC DEFAULT 0,
  avg_rating NUMERIC DEFAULT 0,
  response_time_hours NUMERIC DEFAULT 0,
  score NUMERIC DEFAULT 0,
  grade TEXT DEFAULT 'unrated',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_id, period_start, period_end)
);

ALTER TABLE public.vendor_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Admins can read/write, vendors can read their own
CREATE POLICY "Admins can manage vendor performance"
ON public.vendor_performance_metrics
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Vendors can view own performance"
ON public.vendor_performance_metrics
FOR SELECT
USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);

-- Function to compute vendor performance scores
CREATE OR REPLACE FUNCTION public.compute_vendor_performance(
  p_period_start DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_period_end DATE DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_total_orders INTEGER;
  v_total_revenue NUMERIC;
  v_delivered_orders INTEGER;
  v_on_time_orders INTEGER;
  v_cancelled_orders INTEGER;
  v_returned_orders INTEGER;
  v_avg_rating NUMERIC;
  v_on_time_rate NUMERIC;
  v_cancel_rate NUMERIC;
  v_return_rate NUMERIC;
  v_score NUMERIC;
  v_grade TEXT;
BEGIN
  FOR v_record IN SELECT id FROM vendors WHERE is_active = true
  LOOP
    -- Total orders for vendor in period
    SELECT COUNT(*), COALESCE(SUM(so.total), 0)
    INTO v_total_orders, v_total_revenue
    FROM sub_orders so
    JOIN orders o ON o.id = so.order_id
    WHERE so.vendor_id = v_record.id
      AND o.created_at >= p_period_start
      AND o.created_at < p_period_end + INTERVAL '1 day';

    -- Delivered orders
    SELECT COUNT(*)
    INTO v_delivered_orders
    FROM sub_orders so
    JOIN orders o ON o.id = so.order_id
    WHERE so.vendor_id = v_record.id
      AND so.status = 'delivered'
      AND o.created_at >= p_period_start
      AND o.created_at < p_period_end + INTERVAL '1 day';

    -- Cancelled orders
    SELECT COUNT(*)
    INTO v_cancelled_orders
    FROM sub_orders so
    JOIN orders o ON o.id = so.order_id
    WHERE so.vendor_id = v_record.id
      AND so.status = 'cancelled'
      AND o.created_at >= p_period_start
      AND o.created_at < p_period_end + INTERVAL '1 day';

    -- Returned orders
    SELECT COUNT(*)
    INTO v_returned_orders
    FROM return_requests rr
    WHERE rr.vendor_id = v_record.id
      AND rr.created_at >= p_period_start
      AND rr.created_at < p_period_end + INTERVAL '1 day';

    -- Average rating from reviews on vendor's products
    SELECT COALESCE(AVG(r.rating), 0)
    INTO v_avg_rating
    FROM reviews r
    JOIN products p ON p.id = r.product_id
    WHERE p.vendor_id = v_record.id
      AND r.created_at >= p_period_start
      AND r.created_at < p_period_end + INTERVAL '1 day';

    -- Compute rates
    IF v_total_orders > 0 THEN
      v_on_time_rate := (v_delivered_orders::NUMERIC / v_total_orders) * 100;
      v_cancel_rate := (v_cancelled_orders::NUMERIC / v_total_orders) * 100;
      v_return_rate := (v_returned_orders::NUMERIC / GREATEST(v_delivered_orders, 1)) * 100;
    ELSE
      v_on_time_rate := 0;
      v_cancel_rate := 0;
      v_return_rate := 0;
    END IF;

    -- Composite score: weighted formula
    -- On-time: 30%, Rating: 25%, Low cancel: 25%, Low return: 20%
    v_score := (v_on_time_rate * 0.30) 
             + (LEAST(v_avg_rating / 5.0 * 100, 100) * 0.25) 
             + (GREATEST(100 - v_cancel_rate * 10, 0) * 0.25)
             + (GREATEST(100 - v_return_rate * 5, 0) * 0.20);
    v_score := LEAST(GREATEST(v_score, 0), 100);

    -- Grade
    IF v_score >= 90 THEN v_grade := 'excellent';
    ELSIF v_score >= 80 THEN v_grade := 'good';
    ELSIF v_score >= 60 THEN v_grade := 'average';
    ELSE v_grade := 'poor';
    END IF;

    -- Upsert
    INSERT INTO vendor_performance_metrics (
      vendor_id, period_start, period_end, total_orders, total_revenue,
      on_time_delivery_rate, cancellation_rate, return_rate, avg_rating,
      score, grade, updated_at
    ) VALUES (
      v_record.id, p_period_start, p_period_end, v_total_orders, v_total_revenue,
      v_on_time_rate, v_cancel_rate, v_return_rate, v_avg_rating,
      v_score, v_grade, now()
    )
    ON CONFLICT (vendor_id, period_start, period_end)
    DO UPDATE SET
      total_orders = EXCLUDED.total_orders,
      total_revenue = EXCLUDED.total_revenue,
      on_time_delivery_rate = EXCLUDED.on_time_delivery_rate,
      cancellation_rate = EXCLUDED.cancellation_rate,
      return_rate = EXCLUDED.return_rate,
      avg_rating = EXCLUDED.avg_rating,
      score = EXCLUDED.score,
      grade = EXCLUDED.grade,
      updated_at = now();
  END LOOP;
END;
$$;
