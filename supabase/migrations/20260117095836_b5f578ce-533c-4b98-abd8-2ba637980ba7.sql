-- Create table for A/B testing analytics on banners
CREATE TABLE public.banner_ab_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_id UUID NOT NULL,
  variant TEXT NOT NULL DEFAULT 'A', -- 'A' or 'B'
  event_type TEXT NOT NULL, -- 'view' or 'click'
  user_id UUID,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast analytics queries
CREATE INDEX idx_banner_ab_analytics_banner ON public.banner_ab_analytics(banner_id);
CREATE INDEX idx_banner_ab_analytics_created_at ON public.banner_ab_analytics(created_at);
CREATE INDEX idx_banner_ab_analytics_composite ON public.banner_ab_analytics(banner_id, variant, event_type);

-- Enable RLS
ALTER TABLE public.banner_ab_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics (anonymous tracking)
CREATE POLICY "Anyone can insert banner analytics"
ON public.banner_ab_analytics
FOR INSERT
WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can read banner analytics"
ON public.banner_ab_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add A/B testing fields to cms_content for banners
-- ab_enabled: whether A/B testing is enabled
-- ab_traffic_split: percentage of traffic for variant A (e.g., 50 means 50/50 split)
-- ab_variant_b_content: alternative content for variant B

ALTER TABLE public.cms_content
ADD COLUMN IF NOT EXISTS ab_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ab_traffic_split INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS ab_variant_b_content JSONB;