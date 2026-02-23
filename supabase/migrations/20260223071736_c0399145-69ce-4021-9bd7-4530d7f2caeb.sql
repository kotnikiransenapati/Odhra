-- Fix SECURITY DEFINER views by recreating as SECURITY INVOKER
-- This ensures RLS policies of the querying user are enforced

-- Recreate vendors_public view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.vendors_public
WITH (security_invoker = true)
AS
SELECT id, brand_name, slug, bio, logo_url, banner_url, social_links, is_active, is_verified, created_at
FROM vendors
WHERE is_active = true AND is_verified = true;

-- Recreate loyalty_leaderboard view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.loyalty_leaderboard
WITH (security_invoker = true)
AS
SELECT 
  lp.user_id,
  COALESCE(
    CASE
      WHEN length(p.full_name) > 2 THEN left(p.full_name, 1) || repeat('*', GREATEST(length(p.full_name) - 2, 1)) || right(p.full_name, 1)
      ELSE p.full_name
    END, 'Anonymous'
  ) AS display_name,
  p.avatar_url,
  lp.lifetime_points,
  lp.tier,
  lp.streak_days,
  (SELECT count(*) FROM achievements a WHERE a.user_id = lp.user_id) AS badges_count,
  rank() OVER (ORDER BY lp.lifetime_points DESC) AS rank
FROM loyalty_points lp
JOIN profiles p ON lp.user_id = p.id
WHERE lp.lifetime_points > 0
ORDER BY lp.lifetime_points DESC
LIMIT 100;