
-- Add new granular permission definitions for all admin features
-- Using ON CONFLICT to avoid duplicates if any already exist

INSERT INTO admin_permission_definitions (permission_key, permission_name, category, is_sensitive, description)
VALUES
  -- Marketing (new)
  ('manage_loyalty', 'Manage Loyalty & Rewards', 'marketing', false, 'Create and manage loyalty programs, tiers, and rewards'),
  ('manage_flash_sales', 'Manage Flash Sales', 'marketing', false, 'Create, edit, and manage flash sale events'),
  ('manage_ab_testing', 'Manage A/B Testing', 'marketing', false, 'Configure and view A/B test experiments'),
  ('manage_campaign_links', 'Manage Campaign Links', 'marketing', false, 'Create and track campaign/UTM links'),
  ('manage_newsletter', 'Manage Newsletter', 'marketing', false, 'Manage newsletter contacts and footer signups'),
  ('manage_whatsapp', 'Manage WhatsApp', 'marketing', false, 'Configure WhatsApp messaging and templates'),
  
  -- Analytics (new)
  ('view_funnel_analytics', 'View Funnel Analytics', 'analytics', false, 'View conversion funnel analytics'),
  ('view_behavior_analytics', 'View Behavior Analytics', 'analytics', false, 'View user behavior tracking data'),
  ('view_ga4', 'View Google Analytics', 'analytics', false, 'View GA4 analytics dashboard'),
  ('view_fb_pixel', 'View Facebook Pixel', 'analytics', false, 'View Facebook Pixel analytics'),
  
  -- Products (new)
  ('manage_inventory_alerts', 'Manage Inventory Alerts', 'products', false, 'Configure and view inventory alert thresholds'),
  
  -- Customers (new)
  ('view_customer_360', 'View Customer 360°', 'customers', false, 'View comprehensive customer profiles'),
  
  -- Finance (new)
  ('manage_commissions', 'Manage Commissions', 'finance', false, 'Configure and manage vendor commission rates'),
  ('manage_reconciliation', 'Manage Reconciliation', 'finance', true, 'View and manage payment reconciliation'),
  
  -- Support (new)
  ('manage_live_chat', 'Manage Live Chat', 'support', false, 'Manage live chat conversations and settings'),
  ('manage_staff_workload', 'Manage Staff Workload', 'support', false, 'View and manage staff workload distribution'),
  
  -- Content (new)
  ('manage_theme', 'Manage Theme', 'content', false, 'Customize theme colors and branding'),
  ('view_homepage_preview', 'View Homepage Preview', 'content', false, 'Preview homepage layout before publishing'),
  
  -- Settings (new)
  ('manage_integrations', 'Manage Integrations', 'settings', true, 'Configure third-party integrations'),
  ('manage_indiapost', 'Manage India Post', 'settings', false, 'Configure India Post shipping integration'),
  ('manage_recaptcha', 'Manage reCAPTCHA', 'settings', true, 'Configure reCAPTCHA security settings'),
  ('view_error_monitoring', 'View Error Monitoring', 'settings', false, 'View application error logs and monitoring'),
  ('manage_export_import', 'Manage Export/Import', 'settings', true, 'Export and import bulk data'),
  
  -- Orders (new)
  ('view_order_timeline', 'View Order Timeline', 'orders', false, 'View order activity timeline'),
  
  -- Security (new)
  ('view_fraud_detection', 'View Fraud Detection', 'security', true, 'View fraud detection dashboard and signals')
ON CONFLICT (permission_key) DO NOTHING;

-- Now update all roles with comprehensive permissions

-- Super Admin: ALL permissions
UPDATE admin_roles SET permissions = (
  SELECT array_agg(permission_key ORDER BY category, permission_key)
  FROM admin_permission_definitions
), updated_at = now()
WHERE role_name = 'super_admin';

-- Order Manager: orders + returns + refunds + invoices + shipping + timeline
UPDATE admin_roles SET permissions = ARRAY[
  'view_dashboard', 'view_orders', 'manage_orders', 'view_returns', 'manage_returns',
  'process_refunds', 'manage_refunds', 'manage_invoices', 'manage_shipping', 'manage_indiapost',
  'view_customers', 'view_order_timeline'
], updated_at = now()
WHERE role_name = 'order_manager';

-- Product Manager: products + categories + reviews + inventory
UPDATE admin_roles SET permissions = ARRAY[
  'view_dashboard', 'view_products', 'manage_products', 'manage_categories',
  'moderate_reviews', 'manage_inventory_alerts', 'view_analytics'
], updated_at = now()
WHERE role_name = 'product_manager';

-- Marketing Manager: promotions + loyalty + flash sales + spin wheel + campaigns + notifications + CMS + A/B + newsletter + WhatsApp
UPDATE admin_roles SET permissions = ARRAY[
  'view_dashboard', 'view_analytics', 'manage_promotions', 'manage_loyalty',
  'manage_flash_sales', 'manage_spin_wheel', 'manage_ab_testing', 'manage_campaign_links',
  'manage_newsletter', 'manage_whatsapp', 'send_notifications', 'manage_cms',
  'manage_banners', 'manage_theme', 'view_homepage_preview',
  'view_funnel_analytics', 'view_behavior_analytics', 'manage_segments',
  'view_fb_pixel', 'view_ga4'
], updated_at = now()
WHERE role_name = 'marketing_manager';

-- Finance Manager: payouts + refunds + disputes + invoices + commissions + reconciliation + revenue
UPDATE admin_roles SET permissions = ARRAY[
  'view_dashboard', 'view_analytics', 'view_orders', 'view_payouts', 'process_payouts',
  'view_revenue', 'manage_disputes', 'process_refunds', 'manage_refunds',
  'manage_invoices', 'manage_commissions', 'manage_reconciliation',
  'manage_tax', 'export_reports'
], updated_at = now()
WHERE role_name = 'finance_manager';

-- Vendor Manager: vendors + performance + commissions + products
UPDATE admin_roles SET permissions = ARRAY[
  'view_dashboard', 'view_vendors', 'manage_vendors', 'manage_vendor_performance',
  'impersonate_vendor', 'view_products', 'view_orders', 'manage_commissions',
  'view_payouts'
], updated_at = now()
WHERE role_name = 'vendor_manager';

-- Support Agent: tickets + live chat + SLA + customers + staff workload
UPDATE admin_roles SET permissions = ARRAY[
  'view_dashboard', 'view_tickets', 'manage_tickets', 'assign_tickets',
  'manage_live_chat', 'manage_sla', 'manage_canned_responses', 'manage_ticket_tags',
  'view_internal_notes', 'view_vendor_tickets', 'view_orders', 'view_customers',
  'view_customer_360', 'manage_staff_workload'
], updated_at = now()
WHERE role_name = 'support_agent';

-- Content Editor: CMS + banners + reviews + theme + newsletter + homepage preview
UPDATE admin_roles SET permissions = ARRAY[
  'view_dashboard', 'manage_cms', 'manage_banners', 'moderate_reviews',
  'manage_theme', 'view_homepage_preview', 'manage_newsletter', 'manage_media'
], updated_at = now()
WHERE role_name = 'content_editor';
