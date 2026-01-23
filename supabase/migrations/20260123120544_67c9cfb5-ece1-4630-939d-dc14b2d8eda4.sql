-- =====================================================
-- ADVANCED ADMIN MANAGEMENT & FEATURE CONTROL SYSTEM
-- =====================================================

-- 1. Feature Flags Table - Control features from admin panel
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  category TEXT NOT NULL DEFAULT 'general',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default feature flags
INSERT INTO public.feature_flags (feature_key, feature_name, description, category, is_enabled, settings) VALUES
  ('spin_wheel', 'Spin to Win Wheel', 'Enable spin wheel for discounts', 'marketing', true, '{"min_order_amount": 999, "max_daily_spins": 100}'),
  ('live_purchase_notifications', 'Live Purchase Notifications', 'Show real-time purchase popups', 'marketing', true, '{"display_duration_ms": 5000, "interval_seconds": 45}'),
  ('flash_sales', 'Flash Sales', 'Enable flash sale banners', 'marketing', true, '{}'),
  ('algolia_search', 'Algolia Search', 'Use Algolia for instant search', 'search', true, '{}'),
  ('voice_search', 'Voice Search', 'Enable voice search feature', 'search', true, '{}'),
  ('loyalty_program', 'Loyalty Program', 'Enable loyalty points system', 'engagement', true, '{"points_per_rupee": 1}'),
  ('referral_program', 'Referral Program', 'Enable referral rewards', 'engagement', true, '{"referrer_bonus": 100, "referred_bonus": 50}'),
  ('daily_checkin', 'Daily Check-in', 'Enable daily check-in rewards', 'engagement', true, '{}'),
  ('exit_intent_popup', 'Exit Intent Popup', 'Show popup when user tries to leave', 'marketing', false, '{}'),
  ('cart_abandonment_emails', 'Cart Abandonment Emails', 'Send emails for abandoned carts', 'marketing', true, '{"delay_hours": 1}'),
  ('product_reviews', 'Product Reviews', 'Allow customers to review products', 'products', true, '{"require_approval": true}'),
  ('wishlist', 'Wishlist', 'Enable product wishlist feature', 'products', true, '{}'),
  ('vendor_onboarding', 'Vendor Onboarding', 'Allow new vendor registrations', 'vendors', true, '{}'),
  ('two_factor_auth', '2FA Authentication', 'Enable two-factor authentication', 'security', true, '{}'),
  ('maintenance_mode', 'Maintenance Mode', 'Put site in maintenance mode', 'system', false, '{"message": "We are performing scheduled maintenance. Please check back soon."}');

-- 2. Admin Permission Categories
CREATE TYPE public.admin_permission_category AS ENUM (
  'dashboard',
  'orders',
  'products',
  'vendors',
  'customers',
  'marketing',
  'analytics',
  'settings',
  'support',
  'finance',
  'content',
  'security'
);

-- 3. Admin Permissions Definition Table
CREATE TABLE public.admin_permission_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_key TEXT NOT NULL UNIQUE,
  permission_name TEXT NOT NULL,
  description TEXT,
  category admin_permission_category NOT NULL,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert all permission definitions
INSERT INTO public.admin_permission_definitions (permission_key, permission_name, description, category, is_sensitive) VALUES
  -- Dashboard
  ('view_dashboard', 'View Dashboard', 'Access to admin dashboard overview', 'dashboard', false),
  ('view_analytics', 'View Analytics', 'Access to detailed analytics', 'analytics', false),
  ('export_reports', 'Export Reports', 'Download analytics reports', 'analytics', true),
  
  -- Orders
  ('view_orders', 'View Orders', 'View all customer orders', 'orders', false),
  ('manage_orders', 'Manage Orders', 'Update order status, cancel orders', 'orders', false),
  ('process_refunds', 'Process Refunds', 'Issue refunds to customers', 'orders', true),
  ('view_returns', 'View Returns', 'View return requests', 'orders', false),
  ('manage_returns', 'Manage Returns', 'Approve/reject returns', 'orders', false),
  
  -- Products
  ('view_products', 'View Products', 'View product catalog', 'products', false),
  ('manage_products', 'Manage Products', 'Edit/delete products', 'products', false),
  ('manage_categories', 'Manage Categories', 'Create/edit categories', 'products', false),
  ('moderate_reviews', 'Moderate Reviews', 'Approve/reject product reviews', 'products', false),
  
  -- Vendors
  ('view_vendors', 'View Vendors', 'View vendor list and details', 'vendors', false),
  ('manage_vendors', 'Manage Vendors', 'Approve/suspend vendors', 'vendors', false),
  ('impersonate_vendor', 'Impersonate Vendor', 'Login as vendor for support', 'vendors', true),
  
  -- Customers
  ('view_customers', 'View Customers', 'View customer list and profiles', 'customers', false),
  ('manage_customers', 'Manage Customers', 'Edit customer accounts', 'customers', false),
  ('view_customer_data', 'View Customer Data', 'Access sensitive customer data', 'customers', true),
  
  -- Marketing
  ('manage_promotions', 'Manage Promotions', 'Create/edit discount codes', 'marketing', false),
  ('manage_spin_wheel', 'Manage Spin Wheel', 'Configure spin wheel prizes', 'marketing', false),
  ('send_notifications', 'Send Notifications', 'Send push notifications to users', 'marketing', false),
  ('manage_cms', 'Manage CMS', 'Edit homepage and content blocks', 'content', false),
  ('manage_banners', 'Manage Banners', 'Update promotional banners', 'content', false),
  
  -- Finance
  ('view_payouts', 'View Payouts', 'View payout requests', 'finance', false),
  ('process_payouts', 'Process Payouts', 'Approve/process vendor payouts', 'finance', true),
  ('view_revenue', 'View Revenue', 'Access revenue and financial data', 'finance', true),
  ('manage_disputes', 'Manage Disputes', 'Handle payment disputes', 'finance', true),
  
  -- Support
  ('view_tickets', 'View Tickets', 'View support tickets', 'support', false),
  ('manage_tickets', 'Manage Tickets', 'Respond to and close tickets', 'support', false),
  ('assign_tickets', 'Assign Tickets', 'Assign tickets to team members', 'support', false),
  
  -- Settings
  ('view_settings', 'View Settings', 'View system settings', 'settings', false),
  ('manage_settings', 'Manage Settings', 'Modify system settings', 'settings', true),
  ('manage_feature_flags', 'Manage Feature Flags', 'Toggle features on/off', 'settings', true),
  
  -- Security
  ('view_audit_log', 'View Audit Log', 'View admin activity log', 'security', true),
  ('manage_admins', 'Manage Admins', 'Add/remove admin users', 'security', true),
  ('manage_roles', 'Manage Roles', 'Create and assign admin roles', 'security', true);

-- 4. Admin Roles Table (predefined role templates)
CREATE TABLE public.admin_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default admin roles
INSERT INTO public.admin_roles (role_name, display_name, description, permissions, is_system_role) VALUES
  ('super_admin', 'Super Admin', 'Full access to all features', ARRAY[
    'view_dashboard', 'view_analytics', 'export_reports',
    'view_orders', 'manage_orders', 'process_refunds', 'view_returns', 'manage_returns',
    'view_products', 'manage_products', 'manage_categories', 'moderate_reviews',
    'view_vendors', 'manage_vendors', 'impersonate_vendor',
    'view_customers', 'manage_customers', 'view_customer_data',
    'manage_promotions', 'manage_spin_wheel', 'send_notifications', 'manage_cms', 'manage_banners',
    'view_payouts', 'process_payouts', 'view_revenue', 'manage_disputes',
    'view_tickets', 'manage_tickets', 'assign_tickets',
    'view_settings', 'manage_settings', 'manage_feature_flags',
    'view_audit_log', 'manage_admins', 'manage_roles'
  ], true),
  
  ('order_manager', 'Order Manager', 'Manage orders and returns', ARRAY[
    'view_dashboard', 'view_orders', 'manage_orders', 'view_returns', 'manage_returns', 'view_customers'
  ], true),
  
  ('product_manager', 'Product Manager', 'Manage products and categories', ARRAY[
    'view_dashboard', 'view_products', 'manage_products', 'manage_categories', 'moderate_reviews'
  ], true),
  
  ('marketing_manager', 'Marketing Manager', 'Manage promotions and content', ARRAY[
    'view_dashboard', 'view_analytics', 'manage_promotions', 'manage_spin_wheel', 
    'send_notifications', 'manage_cms', 'manage_banners'
  ], true),
  
  ('finance_manager', 'Finance Manager', 'Handle payouts and disputes', ARRAY[
    'view_dashboard', 'view_analytics', 'view_payouts', 'process_payouts', 
    'view_revenue', 'manage_disputes', 'view_orders', 'process_refunds'
  ], true),
  
  ('support_agent', 'Support Agent', 'Handle customer support tickets', ARRAY[
    'view_dashboard', 'view_tickets', 'manage_tickets', 'view_orders', 'view_customers'
  ], true),
  
  ('vendor_manager', 'Vendor Manager', 'Manage vendor accounts', ARRAY[
    'view_dashboard', 'view_vendors', 'manage_vendors', 'view_products', 'view_orders'
  ], true),
  
  ('content_editor', 'Content Editor', 'Manage website content', ARRAY[
    'view_dashboard', 'manage_cms', 'manage_banners', 'moderate_reviews'
  ], true);

-- 5. Admin Users Table (extended admin info)
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  admin_role_id UUID REFERENCES public.admin_roles(id),
  custom_permissions TEXT[] DEFAULT '{}',
  is_owner BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  access_starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  access_expires_at TIMESTAMP WITH TIME ZONE,
  last_active_at TIMESTAMP WITH TIME ZONE,
  ip_whitelist TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Admin Invites Table
CREATE TABLE public.admin_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  admin_role_id UUID REFERENCES public.admin_roles(id),
  custom_permissions TEXT[] DEFAULT '{}',
  access_expires_at TIMESTAMP WITH TIME ZONE,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Admin Audit Log Table
CREATE TABLE public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_feature_flags_category ON public.feature_flags(category);
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(is_enabled);
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_active ON public.admin_users(is_active);
CREATE INDEX idx_admin_invites_email ON public.admin_invites(email);
CREATE INDEX idx_admin_invites_status ON public.admin_invites(status);
CREATE INDEX idx_admin_invites_token ON public.admin_invites(invite_token);
CREATE INDEX idx_admin_audit_log_user ON public.admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Feature flags: Anyone can read enabled flags, admins can manage
CREATE POLICY "Anyone can view enabled feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Permission definitions: Anyone can read
CREATE POLICY "Anyone can view permission definitions"
  ON public.admin_permission_definitions FOR SELECT
  USING (true);

-- Admin roles: Anyone can read, only super admins can manage
CREATE POLICY "Anyone can view admin roles"
  ON public.admin_roles FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage roles"
  ON public.admin_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN public.admin_roles ar ON au.admin_role_id = ar.id
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
      AND (au.is_owner = true OR 'manage_roles' = ANY(ar.permissions) OR 'manage_roles' = ANY(au.custom_permissions))
    )
  );

-- Admin users: Admins can view, owners/super admins can manage
CREATE POLICY "Admins can view admin users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Owners can manage admin users"
  ON public.admin_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN public.admin_roles ar ON au.admin_role_id = ar.id
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
      AND (au.is_owner = true OR 'manage_admins' = ANY(ar.permissions) OR 'manage_admins' = ANY(au.custom_permissions))
    )
  );

-- Admin invites: Only admins with manage_admins permission
CREATE POLICY "Admins with permission can view invites"
  ON public.admin_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN public.admin_roles ar ON au.admin_role_id = ar.id
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
      AND (au.is_owner = true OR 'manage_admins' = ANY(ar.permissions) OR 'manage_admins' = ANY(au.custom_permissions))
    )
  );

CREATE POLICY "Admins with permission can manage invites"
  ON public.admin_invites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN public.admin_roles ar ON au.admin_role_id = ar.id
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
      AND (au.is_owner = true OR 'manage_admins' = ANY(ar.permissions) OR 'manage_admins' = ANY(au.custom_permissions))
    )
  );

-- Audit log: Only admins with view_audit_log permission
CREATE POLICY "Admins with permission can view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN public.admin_roles ar ON au.admin_role_id = ar.id
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
      AND (au.is_owner = true OR 'view_audit_log' = ANY(ar.permissions) OR 'view_audit_log' = ANY(au.custom_permissions))
    )
  );

CREATE POLICY "System can insert audit log"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Function to check if admin has specific permission
CREATE OR REPLACE FUNCTION public.admin_has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  SELECT au.*, ar.permissions as role_permissions
  INTO admin_record
  FROM public.admin_users au
  LEFT JOIN public.admin_roles ar ON au.admin_role_id = ar.id
  WHERE au.user_id = _user_id
    AND au.is_active = true
    AND (au.access_starts_at IS NULL OR au.access_starts_at <= now())
    AND (au.access_expires_at IS NULL OR au.access_expires_at > now());
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Owners have all permissions
  IF admin_record.is_owner THEN
    RETURN true;
  END IF;
  
  -- Check custom permissions first
  IF _permission = ANY(admin_record.custom_permissions) THEN
    RETURN true;
  END IF;
  
  -- Check role permissions
  IF _permission = ANY(admin_record.role_permissions) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to get all permissions for an admin user
CREATE OR REPLACE FUNCTION public.get_admin_permissions(_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  all_permissions TEXT[];
BEGIN
  SELECT au.*, ar.permissions as role_permissions
  INTO admin_record
  FROM public.admin_users au
  LEFT JOIN public.admin_roles ar ON au.admin_role_id = ar.id
  WHERE au.user_id = _user_id
    AND au.is_active = true
    AND (au.access_starts_at IS NULL OR au.access_starts_at <= now())
    AND (au.access_expires_at IS NULL OR au.access_expires_at > now());
  
  IF NOT FOUND THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  -- Owners get all permissions
  IF admin_record.is_owner THEN
    RETURN ARRAY(SELECT permission_key FROM public.admin_permission_definitions);
  END IF;
  
  -- Combine role and custom permissions
  all_permissions := COALESCE(admin_record.role_permissions, ARRAY[]::TEXT[]) || 
                     COALESCE(admin_record.custom_permissions, ARRAY[]::TEXT[]);
  
  -- Remove duplicates
  RETURN ARRAY(SELECT DISTINCT unnest(all_permissions));
END;
$$;

-- Function to log admin action
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action TEXT,
  _entity_type TEXT DEFAULT NULL,
  _entity_id TEXT DEFAULT NULL,
  _old_values JSONB DEFAULT NULL,
  _new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id, action, entity_type, entity_id, old_values, new_values
  ) VALUES (
    auth.uid(), _action, _entity_type, _entity_id, _old_values, _new_values
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for feature flags (so UI updates instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;