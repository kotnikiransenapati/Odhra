CREATE OR REPLACE FUNCTION public.admin_customer_360_metrics(_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_orders INT := 0;
  v_total_spent NUMERIC := 0;
  v_avg_order_value NUMERIC := 0;
  v_first_order TIMESTAMPTZ;
  v_last_order TIMESTAMPTZ;
  v_months_since_first NUMERIC := 1;
  v_purchase_frequency NUMERIC := 0;
  v_days_since_last INT := 999;
  v_avg_gap NUMERIC := 0;
  v_expected_gap NUMERIC := 30;
  v_churn_score INT := 0;
  v_churn_risk TEXT := 'high';
  v_return_count INT := 0;
  v_return_rate NUMERIC := 0;
  v_review_count INT := 0;
  v_loyalty_tier TEXT := 'bronze';
  v_payment_method TEXT := 'N/A';
  v_categories TEXT[] := ARRAY[]::TEXT[];
  v_predicted_next TIMESTAMPTZ;
  v_confidence INT := 35;
  v_retention_factor NUMERIC := 1;
  v_predicted_ltv NUMERIC := 0;
  v_risk JSONB;
  v_insights TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT (
    public.admin_has_permission(auth.uid(), 'view_customer_360')
    OR public.admin_has_permission(auth.uid(), 'view_customers')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH paid_orders AS (
    SELECT id, total_amount, payment_method, created_at,
           lag(created_at) OVER (ORDER BY created_at) AS previous_created_at
    FROM public.orders
    WHERE customer_id = _customer_id
      AND payment_status::text = 'paid'
    ORDER BY created_at
  )
  SELECT
    COUNT(*)::INT,
    COALESCE(SUM(total_amount), 0),
    COALESCE(AVG(total_amount), 0),
    MIN(created_at),
    MAX(created_at),
    COALESCE(AVG(EXTRACT(EPOCH FROM (created_at - previous_created_at)) / 86400) FILTER (WHERE previous_created_at IS NOT NULL), 0)
  INTO v_total_orders, v_total_spent, v_avg_order_value, v_first_order, v_last_order, v_avg_gap
  FROM paid_orders;

  IF v_first_order IS NOT NULL THEN
    v_months_since_first := GREATEST(EXTRACT(EPOCH FROM (now() - v_first_order)) / 86400 / 30, 1);
    v_purchase_frequency := v_total_orders / v_months_since_first;
  END IF;

  IF v_last_order IS NOT NULL THEN
    v_days_since_last := GREATEST(FLOOR(EXTRACT(EPOCH FROM (now() - v_last_order)) / 86400)::INT, 0);
  END IF;

  v_expected_gap := CASE WHEN v_avg_gap > 0 THEN GREATEST(v_avg_gap, 7) ELSE 30 END;

  IF v_total_orders = 0 THEN
    v_churn_score := 100;
  ELSIF v_total_orders = 1 THEN
    v_churn_score := CASE WHEN v_days_since_last > 90 THEN 85 WHEN v_days_since_last > 30 THEN 50 ELSE 30 END;
  ELSE
    v_churn_score := CASE
      WHEN (v_days_since_last - v_expected_gap) <= 0 THEN 5
      WHEN (v_days_since_last - v_expected_gap) <= v_expected_gap * 0.5 THEN 25
      WHEN (v_days_since_last - v_expected_gap) <= v_expected_gap THEN 50
      WHEN (v_days_since_last - v_expected_gap) <= v_expected_gap * 2 THEN 75
      ELSE 90
    END;
  END IF;

  v_churn_risk := CASE
    WHEN v_churn_score >= 80 THEN 'churned'
    WHEN v_churn_score >= 50 THEN 'high'
    WHEN v_churn_score >= 25 THEN 'medium'
    ELSE 'low'
  END;

  SELECT COUNT(*)::INT INTO v_return_count
  FROM public.return_requests
  WHERE customer_id = _customer_id;
  v_return_rate := CASE WHEN v_total_orders > 0 THEN (v_return_count::NUMERIC / v_total_orders) * 100 ELSE 0 END;

  SELECT COUNT(*)::INT INTO v_review_count
  FROM public.reviews
  WHERE user_id = _customer_id;

  SELECT COALESCE(lp.tier, 'bronze') INTO v_loyalty_tier
  FROM public.loyalty_points lp
  WHERE lp.user_id = _customer_id
  LIMIT 1;
  v_loyalty_tier := COALESCE(v_loyalty_tier, 'bronze');

  SELECT COALESCE(method, 'N/A') INTO v_payment_method
  FROM (
    SELECT COALESCE(NULLIF(payment_method, ''), 'unknown') AS method, COUNT(*) AS uses
    FROM public.orders
    WHERE customer_id = _customer_id AND payment_status::text = 'paid'
    GROUP BY 1
    ORDER BY uses DESC, method ASC
    LIMIT 1
  ) ranked_methods;
  v_payment_method := COALESCE(v_payment_method, 'N/A');

  SELECT COALESCE(array_agg(category_name ORDER BY revenue DESC), ARRAY[]::TEXT[]) INTO v_categories
  FROM (
    SELECT COALESCE(c.name, 'Uncategorised') AS category_name, SUM(oi.total_price) AS revenue
    FROM public.order_items oi
    JOIN public.sub_orders so ON so.id = oi.sub_order_id
    JOIN public.orders o ON o.id = so.order_id
    LEFT JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE o.customer_id = _customer_id
      AND o.payment_status::text = 'paid'
    GROUP BY 1
    ORDER BY revenue DESC
    LIMIT 5
  ) cats;

  IF v_last_order IS NOT NULL AND v_avg_gap > 0 THEN
    v_predicted_next := v_last_order + make_interval(days => ROUND(v_avg_gap)::INT);
  END IF;

  v_retention_factor := GREATEST(0.15, 1 - (v_churn_score::NUMERIC / 120));
  v_predicted_ltv := v_total_spent + (v_avg_order_value * GREATEST(v_purchase_frequency * 12, 0) * v_retention_factor);
  v_confidence := LEAST(95, 35 + LEAST(v_total_orders * 8, 40) + CASE WHEN v_review_count > 0 THEN 10 ELSE 0 END + CASE WHEN cardinality(v_categories) > 0 THEN 10 ELSE 0 END);

  IF v_total_orders >= 5 THEN v_insights := array_append(v_insights, 'Repeat buyer'); END IF;
  IF v_total_spent >= 50000 THEN v_insights := array_append(v_insights, 'VIP spending potential'); END IF;
  IF v_churn_score >= 50 THEN v_insights := array_append(v_insights, 'Win-back recommended'); END IF;
  IF v_return_rate >= 20 THEN v_insights := array_append(v_insights, 'High return sensitivity'); END IF;
  IF cardinality(v_categories) > 0 THEN v_insights := array_append(v_insights, 'Prefers ' || v_categories[1]); END IF;
  IF v_review_count > 0 THEN v_insights := array_append(v_insights, 'Review contributor'); END IF;

  v_risk := jsonb_build_object(
    'orders', v_total_orders,
    'failed_payments', 0,
    'returns', v_return_count,
    'return_rate', ROUND(v_return_rate, 1),
    'churn_score', v_churn_score,
    'customer_360_confidence', v_confidence,
    'schema_version', 3
  );

  INSERT INTO public.customer_risk_scores (user_id, score, tier, factors, last_computed_at)
  VALUES (
    _customer_id,
    LEAST(100, GREATEST(0, ROUND((v_churn_score * 0.45) + (LEAST(v_return_rate, 100) * 0.35))))::INT,
    public.derive_risk_tier(LEAST(100, GREATEST(0, ROUND((v_churn_score * 0.45) + (LEAST(v_return_rate, 100) * 0.35))))::INT),
    v_risk,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    score = CASE WHEN customer_risk_scores.manual_override THEN customer_risk_scores.score ELSE EXCLUDED.score END,
    tier = CASE WHEN customer_risk_scores.manual_override THEN customer_risk_scores.tier ELSE EXCLUDED.tier END,
    factors = customer_risk_scores.factors || EXCLUDED.factors,
    last_computed_at = now();

  RETURN jsonb_build_object(
    'ltv', ROUND(v_total_spent, 0),
    'predicted_ltv_12m', ROUND(v_predicted_ltv, 0),
    'avg_order_value', ROUND(v_avg_order_value, 0),
    'purchase_frequency', ROUND(v_purchase_frequency, 2),
    'days_since_last_purchase', v_days_since_last,
    'churn_risk', v_churn_risk,
    'churn_score', v_churn_score,
    'total_orders', v_total_orders,
    'total_spent', ROUND(v_total_spent, 0),
    'first_order_date', v_first_order,
    'last_order_date', v_last_order,
    'average_days_between_orders', ROUND(v_avg_gap, 0),
    'preferred_categories', COALESCE(to_jsonb(v_categories), '[]'::jsonb),
    'preferred_payment_method', v_payment_method,
    'return_rate', ROUND(v_return_rate, 1),
    'review_count', v_review_count,
    'loyalty_tier', v_loyalty_tier,
    'predicted_next_purchase', v_predicted_next,
    'confidence', v_confidence,
    'insights', COALESCE(to_jsonb(v_insights), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_customer_360_metrics(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_customer_360_metrics(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_360_metrics(UUID) TO authenticated;
