-- Phase 3: Intelligence Layer

-- 3.1 User Behavior Events for AI Recommendations
CREATE TABLE public.user_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL, -- 'view', 'add_to_cart', 'purchase', 'wishlist', 'search', 'remove_from_cart'
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  search_query TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_behavior_user_id ON public.user_behavior_events(user_id);
CREATE INDEX idx_behavior_product_id ON public.user_behavior_events(product_id);
CREATE INDEX idx_behavior_event_type ON public.user_behavior_events(event_type);
CREATE INDEX idx_behavior_created_at ON public.user_behavior_events(created_at DESC);
CREATE INDEX idx_behavior_session ON public.user_behavior_events(session_id);

-- RLS for behavior events
ALTER TABLE public.user_behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own behavior events"
ON public.user_behavior_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own behavior events"
ON public.user_behavior_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all behavior events"
ON public.user_behavior_events FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role can insert behavior events"
ON public.user_behavior_events FOR INSERT
TO service_role
WITH CHECK (true);

-- 3.2 Dynamic Pricing Engine
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'time_based', 'inventory_based', 'demand_based', 'customer_segment'
  conditions JSONB NOT NULL DEFAULT '{}',
  price_adjustment JSONB NOT NULL, -- {"type": "percentage", "value": -10} or {"type": "fixed", "value": -100}
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pricing_rules_vendor ON public.pricing_rules(vendor_id);
CREATE INDEX idx_pricing_rules_product ON public.pricing_rules(product_id);
CREATE INDEX idx_pricing_rules_active ON public.pricing_rules(is_active) WHERE is_active = true;

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can manage their own pricing rules"
ON public.pricing_rules FOR ALL
TO authenticated
USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Anyone can view active pricing rules"
ON public.pricing_rules FOR SELECT
TO authenticated
USING (is_active = true);

-- 3.3 Fraud Detection System
CREATE TABLE public.fraud_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL, -- 'velocity', 'amount', 'address', 'device', 'pattern'
  conditions JSONB NOT NULL, -- {"max_orders_per_hour": 5, "max_amount_per_day": 50000}
  action TEXT NOT NULL DEFAULT 'flag', -- 'flag', 'hold', 'block', 'require_verification'
  risk_score_contribution INTEGER DEFAULT 10, -- How much this adds to risk score (0-100)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud rules"
ON public.fraud_rules FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role can access fraud rules"
ON public.fraud_rules FOR SELECT
TO service_role
USING (true);

CREATE TABLE public.fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL, -- 'velocity', 'address_mismatch', 'device_fingerprint', 'amount_anomaly', 'pattern'
  rule_id UUID REFERENCES public.fraud_rules(id) ON DELETE SET NULL,
  risk_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'cleared', 'confirmed_fraud'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fraud_signals_order ON public.fraud_signals(order_id);
CREATE INDEX idx_fraud_signals_user ON public.fraud_signals(user_id);
CREATE INDEX idx_fraud_signals_status ON public.fraud_signals(status);
CREATE INDEX idx_fraud_signals_score ON public.fraud_signals(risk_score DESC);

ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud signals"
ON public.fraud_signals FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role can manage fraud signals"
ON public.fraud_signals FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Order risk score column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fraud_status TEXT DEFAULT 'clean'; -- 'clean', 'flagged', 'held', 'blocked'

-- 3.4 Product Analytics for Recommendations
CREATE TABLE public.product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
  view_count INTEGER DEFAULT 0,
  cart_add_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  wishlist_count INTEGER DEFAULT 0,
  view_to_cart_rate NUMERIC(5,4) DEFAULT 0,
  cart_to_purchase_rate NUMERIC(5,4) DEFAULT 0,
  trending_score NUMERIC(10,2) DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_analytics_trending ON public.product_analytics(trending_score DESC);

ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product analytics"
ON public.product_analytics FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage product analytics"
ON public.product_analytics FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Frequently Bought Together table
CREATE TABLE public.product_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  associated_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  association_type TEXT NOT NULL, -- 'frequently_bought_together', 'viewed_together', 'similar'
  strength NUMERIC(5,4) DEFAULT 0, -- 0-1 correlation strength
  purchase_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, associated_product_id, association_type)
);

CREATE INDEX idx_product_associations_product ON public.product_associations(product_id);
CREATE INDEX idx_product_associations_strength ON public.product_associations(strength DESC);

ALTER TABLE public.product_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product associations"
ON public.product_associations FOR SELECT
USING (true);

CREATE POLICY "Service role can manage product associations"
ON public.product_associations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to calculate dynamic price
CREATE OR REPLACE FUNCTION public.get_dynamic_price(
  p_product_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_price NUMERIC;
  final_price NUMERIC;
  applicable_rules JSONB := '[]'::JSONB;
  rule RECORD;
  adjustment NUMERIC := 0;
  product_stock INTEGER;
BEGIN
  -- Get base price and stock
  SELECT price, stock INTO base_price, product_stock
  FROM products WHERE id = p_product_id;
  
  IF base_price IS NULL THEN
    RETURN jsonb_build_object('error', 'Product not found');
  END IF;
  
  final_price := base_price;
  
  -- Check active pricing rules
  FOR rule IN 
    SELECT * FROM pricing_rules
    WHERE (product_id = p_product_id OR product_id IS NULL)
      AND is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
    ORDER BY priority DESC
  LOOP
    -- Evaluate conditions
    IF rule.rule_type = 'inventory_based' AND product_stock IS NOT NULL THEN
      IF product_stock < COALESCE((rule.conditions->>'low_stock_threshold')::INTEGER, 10) THEN
        -- Low stock, possibly increase price
        IF (rule.price_adjustment->>'type') = 'percentage' THEN
          adjustment := base_price * (rule.price_adjustment->>'value')::NUMERIC / 100;
        ELSE
          adjustment := (rule.price_adjustment->>'value')::NUMERIC;
        END IF;
        final_price := final_price + adjustment;
        applicable_rules := applicable_rules || jsonb_build_object('rule_id', rule.id, 'adjustment', adjustment);
      END IF;
    ELSIF rule.rule_type = 'time_based' THEN
      -- Time-based rules are active if within time window (already checked above)
      IF (rule.price_adjustment->>'type') = 'percentage' THEN
        adjustment := base_price * (rule.price_adjustment->>'value')::NUMERIC / 100;
      ELSE
        adjustment := (rule.price_adjustment->>'value')::NUMERIC;
      END IF;
      final_price := final_price + adjustment;
      applicable_rules := applicable_rules || jsonb_build_object('rule_id', rule.id, 'adjustment', adjustment);
    END IF;
  END LOOP;
  
  -- Ensure price doesn't go below 0
  IF final_price < 0 THEN
    final_price := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'base_price', base_price,
    'final_price', ROUND(final_price, 2),
    'discount', ROUND(base_price - final_price, 2),
    'discount_percentage', CASE WHEN base_price > 0 THEN ROUND(((base_price - final_price) / base_price) * 100, 2) ELSE 0 END,
    'applied_rules', applicable_rules
  );
END;
$$;

-- Function to check fraud on order
CREATE OR REPLACE FUNCTION public.check_order_fraud(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  total_risk_score INTEGER := 0;
  signals JSONB := '[]'::JSONB;
  rule RECORD;
  recent_orders_count INTEGER;
  recent_orders_amount NUMERIC;
  fraud_action TEXT := 'clean';
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = p_order_id;
  
  IF order_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;
  
  -- Check each active fraud rule
  FOR rule IN SELECT * FROM fraud_rules WHERE is_active = true LOOP
    
    -- Velocity check
    IF rule.rule_type = 'velocity' THEN
      SELECT COUNT(*) INTO recent_orders_count
      FROM orders
      WHERE customer_id = order_record.customer_id
        AND created_at > now() - interval '1 hour';
      
      IF recent_orders_count > COALESCE((rule.conditions->>'max_orders_per_hour')::INTEGER, 5) THEN
        total_risk_score := total_risk_score + rule.risk_score_contribution;
        signals := signals || jsonb_build_object(
          'type', 'velocity',
          'rule_id', rule.id,
          'details', jsonb_build_object('orders_in_hour', recent_orders_count)
        );
        
        INSERT INTO fraud_signals (order_id, user_id, signal_type, rule_id, risk_score, details)
        VALUES (p_order_id, order_record.customer_id, 'velocity', rule.id, rule.risk_score_contribution, 
                jsonb_build_object('orders_in_hour', recent_orders_count));
      END IF;
    END IF;
    
    -- Amount check
    IF rule.rule_type = 'amount' THEN
      SELECT COALESCE(SUM(total_amount), 0) INTO recent_orders_amount
      FROM orders
      WHERE customer_id = order_record.customer_id
        AND created_at > now() - interval '24 hours';
      
      IF recent_orders_amount > COALESCE((rule.conditions->>'max_amount_per_day')::NUMERIC, 100000) THEN
        total_risk_score := total_risk_score + rule.risk_score_contribution;
        signals := signals || jsonb_build_object(
          'type', 'amount_anomaly',
          'rule_id', rule.id,
          'details', jsonb_build_object('daily_amount', recent_orders_amount)
        );
        
        INSERT INTO fraud_signals (order_id, user_id, signal_type, rule_id, risk_score, details)
        VALUES (p_order_id, order_record.customer_id, 'amount_anomaly', rule.id, rule.risk_score_contribution,
                jsonb_build_object('daily_amount', recent_orders_amount));
      END IF;
    END IF;
    
    -- Address mismatch check
    IF rule.rule_type = 'address' AND order_record.billing_address IS NOT NULL THEN
      IF order_record.shipping_address->>'city' != order_record.billing_address->>'city' 
         OR order_record.shipping_address->>'state' != order_record.billing_address->>'state' THEN
        total_risk_score := total_risk_score + rule.risk_score_contribution;
        signals := signals || jsonb_build_object(
          'type', 'address_mismatch',
          'rule_id', rule.id,
          'details', jsonb_build_object('shipping_city', order_record.shipping_address->>'city', 'billing_city', order_record.billing_address->>'city')
        );
        
        INSERT INTO fraud_signals (order_id, user_id, signal_type, rule_id, risk_score, details)
        VALUES (p_order_id, order_record.customer_id, 'address_mismatch', rule.id, rule.risk_score_contribution,
                jsonb_build_object('mismatch', true));
      END IF;
    END IF;
  END LOOP;
  
  -- Determine action based on total risk score
  IF total_risk_score >= 80 THEN
    fraud_action := 'blocked';
  ELSIF total_risk_score >= 50 THEN
    fraud_action := 'held';
  ELSIF total_risk_score >= 20 THEN
    fraud_action := 'flagged';
  END IF;
  
  -- Update order with fraud status
  UPDATE orders SET risk_score = total_risk_score, fraud_status = fraud_action WHERE id = p_order_id;
  
  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'risk_score', total_risk_score,
    'action', fraud_action,
    'signals', signals
  );
END;
$$;

-- Insert default fraud rules
INSERT INTO public.fraud_rules (name, description, rule_type, conditions, action, risk_score_contribution) VALUES
('High velocity orders', 'Flag orders if user places more than 5 orders per hour', 'velocity', '{"max_orders_per_hour": 5}', 'flag', 25),
('High daily spend', 'Hold orders if daily spend exceeds ₹1,00,000', 'amount', '{"max_amount_per_day": 100000}', 'hold', 30),
('Address mismatch', 'Flag orders with different billing and shipping cities', 'address', '{}', 'flag', 15),
('Very high single order', 'Hold orders over ₹50,000', 'amount', '{"max_single_order": 50000}', 'hold', 20);

-- Trigger to update updated_at
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fraud_rules_updated_at
  BEFORE UPDATE ON public.fraud_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_analytics_updated_at
  BEFORE UPDATE ON public.product_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_associations_updated_at
  BEFORE UPDATE ON public.product_associations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();