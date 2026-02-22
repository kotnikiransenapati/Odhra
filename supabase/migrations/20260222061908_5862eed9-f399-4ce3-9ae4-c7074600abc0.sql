
-- Canned responses
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  shortcut TEXT,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and CCEs can manage canned responses" ON public.canned_responses
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cce'));

-- Ticket tags
CREATE TABLE IF NOT EXISTS public.ticket_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read tags" ON public.ticket_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tags" ON public.ticket_tags FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Ticket-tag junction
CREATE TABLE IF NOT EXISTS public.ticket_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.ticket_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticket_id, tag_id)
);
ALTER TABLE public.ticket_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and CCEs can manage ticket tags" ON public.ticket_tag_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cce'));

-- SLA policies
CREATE TABLE IF NOT EXISTS public.sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  first_response_hours INTEGER NOT NULL DEFAULT 4,
  resolution_hours INTEGER NOT NULL DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  escalation_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage SLA" ON public.sla_policies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "CCEs can view SLA" ON public.sla_policies
  FOR SELECT USING (public.has_role(auth.uid(), 'cce'));

-- Agent CSAT ratings
CREATE TABLE IF NOT EXISTS public.agent_csat_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id),
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_csat_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can create own ratings" ON public.agent_csat_ratings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins and CCEs can view ratings" ON public.agent_csat_ratings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cce') OR auth.uid() = customer_id);

-- Vendor onboarding progress
CREATE TABLE IF NOT EXISTS public.vendor_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL UNIQUE REFERENCES public.vendors(id),
  steps_completed JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.vendor_onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can manage own progress" ON public.vendor_onboarding_progress
  FOR ALL USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all onboarding" ON public.vendor_onboarding_progress
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for canned_responses only (others already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.canned_responses;

-- Add CCE permissions
INSERT INTO public.admin_permission_definitions (permission_key, permission_name, description, category, is_sensitive)
VALUES
  ('manage_canned_responses', 'Manage Canned Responses', 'Create and edit canned response templates', 'support', false),
  ('view_agent_metrics', 'View Agent Metrics', 'View customer care agent performance metrics', 'analytics', false),
  ('manage_ticket_tags', 'Manage Ticket Tags', 'Create and assign tags to tickets', 'support', false)
ON CONFLICT (permission_key) DO NOTHING;
