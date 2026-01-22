-- ============================================
-- SUBSCRIPTION COMMERCE SYSTEM
-- ============================================

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  interval TEXT NOT NULL CHECK (interval IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  discount_percentage NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  shipping_address JSONB NOT NULL,
  next_billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_billed_at TIMESTAMP WITH TIME ZONE,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  pause_until TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription orders (auto-generated orders from subscriptions)
CREATE TABLE public.subscription_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  billing_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'skipped')),
  billing_attempt INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies for subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Vendors can manage their product subscription plans"
ON public.subscription_plans FOR ALL
USING (EXISTS (
  SELECT 1 FROM products p
  JOIN vendors v ON p.vendor_id = v.id
  WHERE p.id = subscription_plans.product_id
  AND v.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM products p
  JOIN vendors v ON p.vendor_id = v.id
  WHERE p.id = subscription_plans.product_id
  AND v.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all subscription plans"
ON public.subscription_plans FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add RLS policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Vendors can view subscriptions for their products"
ON public.subscriptions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM vendors v
  WHERE v.id = subscriptions.vendor_id
  AND v.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add RLS policies for subscription_orders
ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription orders"
ON public.subscription_orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM subscriptions s
  WHERE s.id = subscription_orders.subscription_id
  AND s.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all subscription orders"
ON public.subscription_orders FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create function to check and award achievement badges
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  badge RECORD;
  user_orders_count INTEGER;
  user_reviews_count INTEGER;
  user_referrals_count INTEGER;
  user_total_spent NUMERIC;
  user_streak INTEGER;
BEGIN
  -- Get user stats
  SELECT COUNT(*) INTO user_orders_count FROM orders WHERE customer_id = p_user_id AND payment_status = 'paid';
  SELECT COUNT(*) INTO user_reviews_count FROM reviews WHERE user_id = p_user_id AND is_approved = true;
  SELECT COUNT(*) INTO user_referrals_count FROM referrals WHERE referrer_id = p_user_id AND status = 'completed';
  SELECT COALESCE(SUM(total_amount), 0) INTO user_total_spent FROM orders WHERE customer_id = p_user_id AND payment_status = 'paid';
  SELECT COALESCE(streak_days, 0) INTO user_streak FROM loyalty_points WHERE user_id = p_user_id;
  
  -- Check each active badge
  FOR badge IN SELECT * FROM badge_definitions WHERE is_active = true LOOP
    -- Skip if already earned
    IF EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND badge_id = badge.id) THEN
      CONTINUE;
    END IF;
    
    -- Check criteria
    IF badge.id = 'first_purchase' AND user_orders_count >= 1 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'loyal_customer_10' AND user_orders_count >= 10 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'loyal_customer_50' AND user_orders_count >= 50 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'first_review' AND user_reviews_count >= 1 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'review_master' AND user_reviews_count >= 10 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'first_referral' AND user_referrals_count >= 1 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'referral_champion' AND user_referrals_count >= 10 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'big_spender_10k' AND user_total_spent >= 10000 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'big_spender_50k' AND user_total_spent >= 50000 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'streak_7' AND user_streak >= 7 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    ELSIF badge.id = 'streak_30' AND user_streak >= 30 THEN
      INSERT INTO achievements (user_id, badge_id) VALUES (p_user_id, badge.id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create default badge definitions
INSERT INTO public.badge_definitions (id, name, description, icon, category, criteria, points_reward, sort_order) VALUES
  ('first_purchase', 'First Purchase', 'Made your first purchase', 'ShoppingBag', 'shopping', '{"orders": 1}', 50, 1),
  ('loyal_customer_10', 'Loyal Customer', 'Completed 10 orders', 'Heart', 'shopping', '{"orders": 10}', 200, 2),
  ('loyal_customer_50', 'Super Shopper', 'Completed 50 orders', 'Crown', 'shopping', '{"orders": 50}', 1000, 3),
  ('first_review', 'Voice of Customer', 'Left your first review', 'MessageSquare', 'engagement', '{"reviews": 1}', 25, 4),
  ('review_master', 'Review Master', 'Left 10 helpful reviews', 'Star', 'engagement', '{"reviews": 10}', 250, 5),
  ('first_referral', 'Friend Maker', 'Referred your first friend', 'Users', 'social', '{"referrals": 1}', 100, 6),
  ('referral_champion', 'Referral Champion', 'Referred 10 friends', 'Trophy', 'social', '{"referrals": 10}', 500, 7),
  ('big_spender_10k', 'Big Spender', 'Spent over ₹10,000', 'Wallet', 'spending', '{"spent": 10000}', 300, 8),
  ('big_spender_50k', 'VIP Shopper', 'Spent over ₹50,000', 'Diamond', 'spending', '{"spent": 50000}', 1000, 9),
  ('streak_7', 'Week Warrior', '7-day check-in streak', 'Flame', 'engagement', '{"streak": 7}', 100, 10),
  ('streak_30', 'Month Master', '30-day check-in streak', 'Zap', 'engagement', '{"streak": 30}', 500, 11)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON public.subscriptions(next_billing_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_orders_subscription_id ON public.subscription_orders(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_product_id ON public.subscription_plans(product_id);

-- Enable realtime for subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;