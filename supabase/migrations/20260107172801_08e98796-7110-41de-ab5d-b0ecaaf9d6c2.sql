-- Create system_settings table for storing all platform settings
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cms_content table for homepage banners, sections, etc.
CREATE TABLE public.cms_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'hero_banner', 'section', 'collection', etc.
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_campaigns table
CREATE TABLE public.notification_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  segment TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'push', -- 'push', 'email', 'sms', 'all'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'completed', 'paused'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_settings (admin only)
CREATE POLICY "Admins can view system settings" ON public.system_settings
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for cms_content
CREATE POLICY "Anyone can view active CMS content" ON public.cms_content
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage CMS content" ON public.cms_content
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for notification_campaigns (admin only)
CREATE POLICY "Admins can view notification campaigns" ON public.notification_campaigns
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage notification campaigns" ON public.notification_campaigns
  FOR ALL USING (public.is_admin(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_cms_content_updated_at
  BEFORE UPDATE ON public.cms_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_notification_campaigns_updated_at
  BEFORE UPDATE ON public.notification_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default system settings
INSERT INTO public.system_settings (key, value, category, description) VALUES
  ('site_name', '"Odhra Marketplace"', 'general', 'The name of the marketplace'),
  ('support_email', '"support@odhra.com"', 'general', 'Support email address'),
  ('support_phone', '"+91 9876543210"', 'general', 'Support phone number'),
  ('default_currency', '"INR"', 'general', 'Default currency for the platform'),
  ('site_description', '"India''s premium multi-vendor marketplace"', 'general', 'Site meta description'),
  ('maintenance_mode', 'false', 'general', 'Enable/disable maintenance mode'),
  ('maintenance_message', '"We''re currently upgrading our systems. Please check back soon!"', 'general', 'Message shown during maintenance'),
  ('default_commission_rate', '10', 'payments', 'Default vendor commission rate (%)'),
  ('min_payout_amount', '500', 'payments', 'Minimum payout request amount'),
  ('payout_holding_days', '7', 'payments', 'Days to hold funds before payout'),
  ('auto_approve_vendors', 'false', 'features', 'Auto-approve new vendors'),
  ('auto_approve_reviews', 'false', 'features', 'Auto-approve customer reviews'),
  ('enable_spin_wheel', 'true', 'features', 'Enable spin-to-win feature'),
  ('enable_flash_sales', 'true', 'features', 'Enable flash sale banners'),
  ('email_new_order', 'true', 'notifications', 'Email on new orders'),
  ('email_low_stock', 'true', 'notifications', 'Email on low stock'),
  ('email_new_vendor', 'true', 'notifications', 'Email on new vendor signup'),
  ('email_payout_request', 'true', 'notifications', 'Email on payout requests'),
  ('email_review_submitted', 'true', 'notifications', 'Email on review submission'),
  ('require_2fa_admin', 'true', 'security', 'Require 2FA for admin accounts'),
  ('session_timeout_minutes', '30', 'security', 'Session timeout in minutes'),
  ('enable_fraud_detection', 'true', 'security', 'Enable AI fraud detection');

-- Insert default homepage sections
INSERT INTO public.cms_content (type, slug, title, content, is_active, sort_order) VALUES
  ('section', 'hero-slider', 'Hero Slider', '{"autoPlay": true, "interval": 5000, "showDots": true}', true, 0),
  ('section', 'trust-badges', 'Trust Badges', '{}', true, 1),
  ('section', 'trending-products', 'Trending Products', '{"limit": 8, "showViewAll": true}', true, 2),
  ('section', 'recommended-products', 'Recommended For You', '{"limit": 8, "personalized": true}', true, 3),
  ('section', 'categories', 'Shop by Category', '{"limit": 5, "showDescription": true}', true, 4),
  ('section', 'spin-wheel', 'Spin & Win', '{"showForNewUsers": true, "minOrderAmount": 1499}', true, 5),
  ('section', 'featured-products', 'Featured Products', '{"limit": 8}', true, 6),
  ('section', 'customer-stories', 'Customer Stories', '{"limit": 6}', true, 7),
  ('section', 'delivery-reviews', 'Delivery Reviews', '{"limit": 4, "showRating": true}', true, 8),
  ('section', 'vendor-cta', 'Become a Seller', '{}', true, 9);

-- Insert default hero banners
INSERT INTO public.cms_content (type, slug, title, content, is_active, sort_order) VALUES
  ('hero_banner', 'hero-1', 'Discover Extraordinary', '{"subtitle": "India''s Premium Multi-Vendor Marketplace", "imageUrl": "/hero-banner-1.jpg", "ctaText": "Shop Now", "ctaLink": "/shop"}', true, 0),
  ('hero_banner', 'hero-2', 'New Season Arrivals', '{"subtitle": "Up to 50% off on fashion collection", "imageUrl": "/hero-banner-2.jpg", "ctaText": "Explore", "ctaLink": "/shop?category=fashion"}', true, 1),
  ('hero_banner', 'hero-3', 'Tech Deals', '{"subtitle": "Latest gadgets at best prices", "imageUrl": "/hero-banner-3.jpg", "ctaText": "View Deals", "ctaLink": "/shop?category=electronics"}', true, 2);