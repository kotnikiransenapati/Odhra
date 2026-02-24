
-- ═══════════════════════════════════════════════════════════════
-- Campaign Tracking Links System
-- Supports: admin invites, vendor recruit, flash sales, promos, ads
-- Full funnel: click → page_view → signup → add_to_cart → purchase
-- ═══════════════════════════════════════════════════════════════

-- Campaign links table
CREATE TABLE public.campaign_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('admin_invite', 'vendor_recruit', 'flash_sale', 'promo', 'ad', 'referral', 'newsletter', 'custom')),
  campaign_name TEXT NOT NULL,
  target_path TEXT NOT NULL DEFAULT '/',
  created_by UUID,
  metadata JSONB DEFAULT '{}',
  personalization JSONB DEFAULT '{}',
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  signup_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaign link events for full funnel tracking
CREATE TABLE public.campaign_link_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.campaign_links(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'page_view', 'signup', 'add_to_cart', 'checkout', 'purchase')),
  user_id UUID,
  session_id TEXT,
  referrer TEXT,
  device_info JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_link_events ENABLE ROW LEVEL SECURITY;

-- Campaign links: admins can CRUD, anyone can read active links (for resolving)
CREATE POLICY "Anyone can read active campaign links"
  ON public.campaign_links FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage campaign links"
  ON public.campaign_links FOR ALL
  USING (public.is_admin(auth.uid()));

-- Campaign link events: anyone can insert (for tracking), admins can read
CREATE POLICY "Anyone can insert campaign events"
  ON public.campaign_link_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read campaign events"
  ON public.campaign_link_events FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_campaign_links_code ON public.campaign_links(code);
CREATE INDEX idx_campaign_links_type ON public.campaign_links(campaign_type);
CREATE INDEX idx_campaign_links_active ON public.campaign_links(is_active, expires_at);
CREATE INDEX idx_campaign_events_link ON public.campaign_link_events(link_id);
CREATE INDEX idx_campaign_events_type ON public.campaign_link_events(event_type);
CREATE INDEX idx_campaign_events_session ON public.campaign_link_events(session_id);

-- Auto-update timestamps
CREATE TRIGGER update_campaign_links_updated_at
  BEFORE UPDATE ON public.campaign_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate short codes
CREATE OR REPLACE FUNCTION public.generate_campaign_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM campaign_links WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Function to increment campaign link stats atomically
CREATE OR REPLACE FUNCTION public.track_campaign_event(
  p_code TEXT,
  p_event_type TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link RECORD;
  result JSONB;
BEGIN
  -- Find the campaign link
  SELECT * INTO v_link FROM campaign_links
  WHERE code = p_code AND is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link not found or expired');
  END IF;
  
  -- Insert event
  INSERT INTO campaign_link_events (link_id, event_type, user_id, session_id, referrer, device_info, metadata)
  VALUES (v_link.id, p_event_type, p_user_id, p_session_id, p_referrer, p_device_info, p_metadata);
  
  -- Update counters
  IF p_event_type = 'click' THEN
    UPDATE campaign_links SET click_count = click_count + 1 WHERE id = v_link.id;
  ELSIF p_event_type = 'signup' THEN
    UPDATE campaign_links SET signup_count = signup_count + 1 WHERE id = v_link.id;
  ELSIF p_event_type = 'purchase' THEN
    UPDATE campaign_links SET purchase_count = purchase_count + 1,
      revenue_generated = revenue_generated + COALESCE((p_metadata->>'amount')::numeric, 0)
    WHERE id = v_link.id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'link_id', v_link.id,
    'target_path', v_link.target_path,
    'campaign_type', v_link.campaign_type,
    'personalization', v_link.personalization,
    'metadata', v_link.metadata
  );
END;
$$;
