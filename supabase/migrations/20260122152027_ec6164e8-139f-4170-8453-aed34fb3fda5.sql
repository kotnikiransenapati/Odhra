-- =============================================
-- PHASE 1: SECURITY TABLES
-- =============================================

-- User Sessions for device management
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.user_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Audit Logs for admin action tracking
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Add 2FA field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;

-- =============================================
-- PHASE 2: LOYALTY & GAMIFICATION TABLES
-- =============================================

-- Loyalty Points Balance
CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  streak_days INTEGER DEFAULT 0,
  last_checkin_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty points"
  ON public.loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loyalty points"
  ON public.loyalty_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loyalty points"
  ON public.loyalty_points FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all loyalty points"
  ON public.loyalty_points FOR SELECT
  USING (is_admin(auth.uid()));

-- Loyalty Transactions
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'expire', 'bonus', 'adjustment')),
  source TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert transactions"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Badge Definitions
CREATE TABLE public.badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'general',
  criteria JSONB DEFAULT '{}',
  points_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active badges"
  ON public.badge_definitions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage badges"
  ON public.badge_definitions FOR ALL
  USING (is_admin(auth.uid()));

-- User Achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL REFERENCES public.badge_definitions(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all achievements"
  ON public.achievements FOR SELECT
  USING (is_admin(auth.uid()));

-- =============================================
-- PHASE 4: REFERRAL SYSTEM TABLES
-- =============================================

-- Referral Codes
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own referral code"
  ON public.referral_codes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all referral codes"
  ON public.referral_codes FOR SELECT
  USING (is_admin(auth.uid()));

-- Referrals Tracking
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  referrer_reward NUMERIC(10,2) DEFAULT 0,
  referred_reward NUMERIC(10,2) DEFAULT 0,
  qualifying_order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update referrals"
  ON public.referrals FOR UPDATE
  USING (true);

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (is_admin(auth.uid()));

-- =============================================
-- PHASE 3: CART RESERVATION
-- =============================================

-- Add reservation timestamp to carts
ALTER TABLE public.carts 
ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;

-- =============================================
-- INSERT DEFAULT BADGE DEFINITIONS
-- =============================================

INSERT INTO public.badge_definitions (id, name, description, icon, category, criteria, points_reward, sort_order) VALUES
('first_purchase', 'First Purchase', 'Made your first purchase', 'ShoppingBag', 'shopping', '{"orders": 1}', 50, 1),
('big_spender', 'Big Spender', 'Spent over ₹10,000 total', 'Crown', 'shopping', '{"total_spent": 10000}', 200, 2),
('loyal_customer', 'Loyal Customer', 'Made 10+ purchases', 'Heart', 'shopping', '{"orders": 10}', 300, 3),
('review_master', 'Review Master', 'Written 5+ reviews', 'Star', 'engagement', '{"reviews": 5}', 100, 4),
('power_reviewer', 'Power Reviewer', 'Written 20+ reviews', 'Award', 'engagement', '{"reviews": 20}', 250, 5),
('social_butterfly', 'Social Butterfly', 'Referred 3+ friends', 'Users', 'social', '{"referrals": 3}', 150, 6),
('influencer', 'Influencer', 'Referred 10+ friends', 'Megaphone', 'social', '{"referrals": 10}', 500, 7),
('early_bird', 'Early Bird', 'One of our first 100 customers', 'Sunrise', 'special', '{"early_adopter": true}', 100, 8),
('streak_7', 'Week Warrior', '7-day login streak', 'Flame', 'engagement', '{"streak": 7}', 70, 9),
('streak_30', 'Monthly Master', '30-day login streak', 'Trophy', 'engagement', '{"streak": 30}', 300, 10),
('wishlist_curator', 'Wishlist Curator', 'Added 10+ items to wishlist', 'Bookmark', 'engagement', '{"wishlist_items": 10}', 50, 11),
('flash_hunter', 'Flash Hunter', 'Bought during a flash sale', 'Zap', 'special', '{"flash_purchase": true}', 30, 12)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- FUNCTION TO CALCULATE LOYALTY TIER
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_loyalty_tier(lifetime_pts INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lifetime_pts >= 10000 THEN
    RETURN 'diamond';
  ELSIF lifetime_pts >= 5000 THEN
    RETURN 'platinum';
  ELSIF lifetime_pts >= 2000 THEN
    RETURN 'gold';
  ELSIF lifetime_pts >= 500 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$;

-- =============================================
-- FUNCTION TO ADD LOYALTY POINTS
-- =============================================

CREATE OR REPLACE FUNCTION public.add_loyalty_points(
  p_user_id UUID,
  p_points INTEGER,
  p_source TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_record loyalty_points%ROWTYPE;
  new_tier TEXT;
  result JSONB;
BEGIN
  -- Get or create loyalty record
  SELECT * INTO current_record FROM loyalty_points WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO loyalty_points (user_id, points, lifetime_points, tier)
    VALUES (p_user_id, p_points, p_points, calculate_loyalty_tier(p_points))
    RETURNING * INTO current_record;
  ELSE
    -- Update points
    new_tier := calculate_loyalty_tier(current_record.lifetime_points + p_points);
    
    UPDATE loyalty_points
    SET 
      points = points + p_points,
      lifetime_points = lifetime_points + p_points,
      tier = new_tier,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO current_record;
  END IF;
  
  -- Record transaction
  INSERT INTO loyalty_transactions (user_id, points, transaction_type, source, reference_id, description)
  VALUES (p_user_id, p_points, 'earn', p_source, p_reference_id, p_description);
  
  result := jsonb_build_object(
    'success', true,
    'points_added', p_points,
    'new_balance', current_record.points,
    'tier', current_record.tier,
    'lifetime_points', current_record.lifetime_points
  );
  
  RETURN result;
END;
$$;

-- =============================================
-- FUNCTION TO GENERATE REFERRAL CODE
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Check if user already has a code
  SELECT code INTO new_code FROM referral_codes WHERE user_id = p_user_id;
  IF FOUND THEN
    RETURN new_code;
  END IF;
  
  -- Generate unique code
  LOOP
    new_code := 'ODH' || upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert new referral code
  INSERT INTO referral_codes (user_id, code)
  VALUES (p_user_id, new_code);
  
  RETURN new_code;
END;
$$;

-- Enable realtime for live notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_transactions;