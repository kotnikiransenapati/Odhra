-- Phase 5: Loyalty & Gamification Enhancements

-- Challenges/Missions System
CREATE TABLE public.loyalty_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'special'
  criteria JSONB NOT NULL, -- {"action": "purchase", "count": 3, "min_amount": 500}
  points_reward INTEGER NOT NULL DEFAULT 50,
  bonus_reward JSONB, -- Additional rewards like badges, coupons
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_completions INTEGER, -- NULL for unlimited
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_challenges_active ON public.loyalty_challenges(is_active, starts_at, ends_at);

ALTER TABLE public.loyalty_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
ON public.loyalty_challenges FOR SELECT
USING (is_active = true AND starts_at <= now() AND ends_at > now());

CREATE POLICY "Admins can manage challenges"
ON public.loyalty_challenges FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- User Challenge Progress
CREATE TABLE public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.loyalty_challenges(id) ON DELETE CASCADE NOT NULL,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_user_challenges_user ON public.user_challenge_progress(user_id);
CREATE INDEX idx_user_challenges_status ON public.user_challenge_progress(is_completed, reward_claimed);

ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
ON public.user_challenge_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_challenge_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.user_challenge_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage progress"
ON public.user_challenge_progress FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Points Redemption Options
CREATE TABLE public.points_redemption_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'discount_percentage', 'discount_fixed', 'free_shipping', 'gift_card'
  reward_value JSONB NOT NULL, -- {"percentage": 10} or {"amount": 100}
  min_tier TEXT, -- Minimum tier required
  is_active BOOLEAN DEFAULT true,
  usage_limit_per_user INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.points_redemption_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active redemption options"
ON public.points_redemption_options FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage redemption options"
ON public.points_redemption_options FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Redemption History
CREATE TABLE public.points_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.points_redemption_options(id) ON DELETE SET NULL,
  points_spent INTEGER NOT NULL,
  reward_code TEXT UNIQUE,
  reward_details JSONB NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'used', 'expired'
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_redemptions_user ON public.points_redemptions(user_id);
CREATE INDEX idx_redemptions_code ON public.points_redemptions(reward_code);
CREATE INDEX idx_redemptions_status ON public.points_redemptions(status);

ALTER TABLE public.points_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own redemptions"
ON public.points_redemptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own redemptions"
ON public.points_redemptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage redemptions"
ON public.points_redemptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Leaderboard View (materialized for performance)
CREATE OR REPLACE VIEW public.loyalty_leaderboard AS
SELECT 
  lp.user_id,
  p.full_name,
  p.avatar_url,
  lp.lifetime_points,
  lp.tier,
  lp.streak_days,
  (SELECT COUNT(*) FROM public.achievements a WHERE a.user_id = lp.user_id) as badges_count,
  RANK() OVER (ORDER BY lp.lifetime_points DESC) as rank
FROM public.loyalty_points lp
JOIN public.profiles p ON lp.user_id = p.id
WHERE lp.lifetime_points > 0
ORDER BY lp.lifetime_points DESC
LIMIT 100;

-- Points expiry system - add expiry tracking
ALTER TABLE public.loyalty_points ADD COLUMN IF NOT EXISTS expiring_points INTEGER DEFAULT 0;
ALTER TABLE public.loyalty_points ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;

-- Add tier upgrade tracking
ALTER TABLE public.loyalty_points ADD COLUMN IF NOT EXISTS last_tier_upgrade_at TIMESTAMPTZ;
ALTER TABLE public.loyalty_points ADD COLUMN IF NOT EXISTS previous_tier TEXT;

-- Insert default redemption options
INSERT INTO public.points_redemption_options (name, description, points_cost, reward_type, reward_value, min_tier) VALUES
('₹50 Off', 'Get ₹50 off your next order', 500, 'discount_fixed', '{"amount": 50}', 'bronze'),
('₹100 Off', 'Get ₹100 off your next order', 900, 'discount_fixed', '{"amount": 100}', 'bronze'),
('₹250 Off', 'Get ₹250 off your next order', 2000, 'discount_fixed', '{"amount": 250}', 'silver'),
('10% Off', 'Get 10% off your entire order', 1000, 'discount_percentage', '{"percentage": 10, "max_discount": 500}', 'bronze'),
('15% Off', 'Get 15% off your entire order', 1500, 'discount_percentage', '{"percentage": 15, "max_discount": 750}', 'silver'),
('Free Shipping', 'Free shipping on any order', 300, 'free_shipping', '{}', 'bronze'),
('₹500 Gift Card', 'Redeem for a ₹500 gift card', 4500, 'gift_card', '{"amount": 500}', 'gold');

-- Insert default challenges
INSERT INTO public.loyalty_challenges (title, description, challenge_type, criteria, points_reward, starts_at, ends_at) VALUES
('First Timer', 'Make your first purchase this week', 'weekly', '{"action": "purchase", "count": 1}', 100, now(), now() + interval '7 days'),
('Review Champion', 'Leave 3 product reviews', 'weekly', '{"action": "review", "count": 3}', 75, now(), now() + interval '7 days'),
('Daily Visitor', 'Check in for 5 consecutive days', 'weekly', '{"action": "checkin", "streak": 5}', 50, now(), now() + interval '7 days'),
('Big Spender', 'Spend ₹2000 or more in a single order', 'monthly', '{"action": "purchase", "min_amount": 2000}', 200, now(), now() + interval '30 days'),
('Social Butterfly', 'Refer 2 friends who make a purchase', 'monthly', '{"action": "referral", "count": 2}', 300, now(), now() + interval '30 days');

-- Triggers for updated_at
CREATE TRIGGER update_loyalty_challenges_updated_at
  BEFORE UPDATE ON public.loyalty_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_challenge_progress_updated_at
  BEFORE UPDATE ON public.user_challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_points_redemption_options_updated_at
  BEFORE UPDATE ON public.points_redemption_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();