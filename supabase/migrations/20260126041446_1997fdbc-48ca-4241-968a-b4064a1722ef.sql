-- Fix security definer view by dropping and recreating without security definer
DROP VIEW IF EXISTS public.loyalty_leaderboard;

-- Create as regular view with proper RLS
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