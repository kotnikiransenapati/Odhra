
-- Add enrichment columns to user_behavior_events for faster querying
ALTER TABLE public.user_behavior_events 
ADD COLUMN IF NOT EXISTS page_url text,
ADD COLUMN IF NOT EXISTS referrer text,
ADD COLUMN IF NOT EXISTS utm_source text,
ADD COLUMN IF NOT EXISTS utm_medium text,
ADD COLUMN IF NOT EXISTS utm_campaign text,
ADD COLUMN IF NOT EXISTS utm_content text,
ADD COLUMN IF NOT EXISTS utm_term text,
ADD COLUMN IF NOT EXISTS device_type text,
ADD COLUMN IF NOT EXISTS dwell_time_ms integer,
ADD COLUMN IF NOT EXISTS scroll_depth integer,
ADD COLUMN IF NOT EXISTS viewport_width integer,
ADD COLUMN IF NOT EXISTS viewport_height integer;

-- Create indexes for common query patterns (recommendations, customer 360, ads)
CREATE INDEX IF NOT EXISTS idx_behavior_user_event ON public.user_behavior_events (user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_behavior_product_event ON public.user_behavior_events (product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_behavior_session ON public.user_behavior_events (session_id);
CREATE INDEX IF NOT EXISTS idx_behavior_created ON public.user_behavior_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_utm ON public.user_behavior_events (utm_source, utm_medium, utm_campaign) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_behavior_category ON public.user_behavior_events (category_id) WHERE category_id IS NOT NULL;

-- Create a user_behavior_summary materialized-like table for fast lookups
CREATE TABLE IF NOT EXISTS public.user_behavior_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_page_views integer DEFAULT 0,
  total_product_views integer DEFAULT 0,
  total_add_to_cart integer DEFAULT 0,
  total_purchases integer DEFAULT 0,
  total_searches integer DEFAULT 0,
  total_wishlist_adds integer DEFAULT 0,
  avg_session_duration_ms integer DEFAULT 0,
  avg_scroll_depth integer DEFAULT 0,
  preferred_categories jsonb DEFAULT '[]'::jsonb,
  preferred_brands jsonb DEFAULT '[]'::jsonb,
  price_range_min numeric DEFAULT 0,
  price_range_max numeric DEFAULT 0,
  last_active_at timestamptz DEFAULT now(),
  engagement_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_behavior_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own behavior profile" ON public.user_behavior_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert behavior profiles" ON public.user_behavior_profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update behavior profiles" ON public.user_behavior_profiles
FOR UPDATE USING (true);

CREATE POLICY "Admins can view all behavior profiles" ON public.user_behavior_profiles
FOR SELECT USING (public.is_admin(auth.uid()));

-- Ensure user_behavior_events allows anon and authenticated inserts
DROP POLICY IF EXISTS "Anyone can insert behavior events" ON public.user_behavior_events;
CREATE POLICY "Anyone can insert behavior events" ON public.user_behavior_events
FOR INSERT WITH CHECK (true);

-- Ensure admins can read all behavior events
DROP POLICY IF EXISTS "Admins can view all behavior events" ON public.user_behavior_events;
CREATE POLICY "Admins can view all behavior events" ON public.user_behavior_events
FOR SELECT USING (public.is_admin(auth.uid()));

-- Users can read own events
DROP POLICY IF EXISTS "Users can view own behavior events" ON public.user_behavior_events;
CREATE POLICY "Users can view own behavior events" ON public.user_behavior_events
FOR SELECT USING (auth.uid() = user_id);

-- Function to update behavior profile from events
CREATE OR REPLACE FUNCTION public.update_behavior_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stats RECORD;
  cat_prefs JSONB;
  price_min NUMERIC;
  price_max NUMERIC;
  eng_score INTEGER;
BEGIN
  -- Aggregate event stats
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'page_view') as pv,
    COUNT(*) FILTER (WHERE event_type = 'product_view') as pdv,
    COUNT(*) FILTER (WHERE event_type = 'add_to_cart') as atc,
    COUNT(*) FILTER (WHERE event_type = 'purchase') as pur,
    COUNT(*) FILTER (WHERE event_type = 'search') as src,
    COUNT(*) FILTER (WHERE event_type = 'wishlist_add') as wl,
    COALESCE(AVG(dwell_time_ms) FILTER (WHERE dwell_time_ms > 0), 0) as avg_dwell,
    COALESCE(AVG(scroll_depth) FILTER (WHERE scroll_depth > 0), 0) as avg_scroll
  INTO stats
  FROM user_behavior_events
  WHERE user_id = p_user_id AND created_at > now() - interval '90 days';

  -- Top categories
  SELECT COALESCE(jsonb_agg(jsonb_build_object('category_id', cat, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO cat_prefs
  FROM (
    SELECT category_id as cat, COUNT(*) as cnt
    FROM user_behavior_events
    WHERE user_id = p_user_id AND category_id IS NOT NULL AND created_at > now() - interval '90 days'
    GROUP BY category_id ORDER BY cnt DESC LIMIT 10
  ) sub;

  -- Price range from viewed/purchased products
  SELECT COALESCE(MIN(p.price), 0), COALESCE(MAX(p.price), 0)
  INTO price_min, price_max
  FROM user_behavior_events ube
  JOIN products p ON ube.product_id = p.id
  WHERE ube.user_id = p_user_id AND ube.event_type IN ('product_view', 'purchase', 'add_to_cart')
    AND ube.created_at > now() - interval '90 days';

  -- Engagement score (0-100): weighted by recency and action value
  eng_score := LEAST(100, (
    stats.pv * 1 + stats.pdv * 3 + stats.atc * 10 + stats.pur * 25 + stats.wl * 5 + stats.src * 2
  )::integer);

  INSERT INTO user_behavior_profiles (
    user_id, total_page_views, total_product_views, total_add_to_cart,
    total_purchases, total_searches, total_wishlist_adds,
    avg_session_duration_ms, avg_scroll_depth, preferred_categories,
    price_range_min, price_range_max, engagement_score, last_active_at, updated_at
  ) VALUES (
    p_user_id, stats.pv, stats.pdv, stats.atc, stats.pur, stats.src, stats.wl,
    stats.avg_dwell::integer, stats.avg_scroll::integer, cat_prefs,
    price_min, price_max, eng_score, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_page_views = EXCLUDED.total_page_views,
    total_product_views = EXCLUDED.total_product_views,
    total_add_to_cart = EXCLUDED.total_add_to_cart,
    total_purchases = EXCLUDED.total_purchases,
    total_searches = EXCLUDED.total_searches,
    total_wishlist_adds = EXCLUDED.total_wishlist_adds,
    avg_session_duration_ms = EXCLUDED.avg_session_duration_ms,
    avg_scroll_depth = EXCLUDED.avg_scroll_depth,
    preferred_categories = EXCLUDED.preferred_categories,
    price_range_min = EXCLUDED.price_range_min,
    price_range_max = EXCLUDED.price_range_max,
    engagement_score = EXCLUDED.engagement_score,
    last_active_at = now(),
    updated_at = now();
END;
$$;
