
-- Newsletter subscribers table
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'footer',
  status TEXT NOT NULL DEFAULT 'active',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Admins can manage subscribers
CREATE POLICY "Admins can manage newsletter subscribers"
  ON public.newsletter_subscribers FOR ALL
  USING (public.is_admin(auth.uid()));

-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- Contact/support submissions table
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  topic TEXT DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all submissions
CREATE POLICY "Admins can manage contact submissions"
  ON public.contact_submissions FOR ALL
  USING (public.is_admin(auth.uid()));

-- Anyone can submit a contact form
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON public.contact_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Footer content management (via existing cms_content table, no new table needed)
-- Just add feature flags for footer sections
INSERT INTO public.feature_flags (feature_key, feature_name, description, is_enabled, category) VALUES
  ('footer_newsletter', 'Footer Newsletter', 'Enable newsletter subscription form in footer', true, 'content'),
  ('footer_support_links', 'Footer Support Links', 'Enable support links in footer', true, 'content'),
  ('cart_sharing', 'Cart Sharing', 'Allow customers to share their cart via link', true, 'commerce'),
  ('bulk_order_actions', 'Bulk Order Actions', 'Enable bulk order status changes in admin', true, 'commerce')
ON CONFLICT (feature_key) DO NOTHING;

-- Triggers
CREATE TRIGGER update_newsletter_subscribers_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_submissions_updated_at
  BEFORE UPDATE ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
