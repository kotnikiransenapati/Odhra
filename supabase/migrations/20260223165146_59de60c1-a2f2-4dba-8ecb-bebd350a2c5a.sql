
-- Email campaign send logs for tracking individual email deliveries
CREATE TABLE public.email_campaign_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, failed
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  resend_id TEXT, -- Resend email ID for tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns to notification_campaigns
ALTER TABLE public.notification_campaigns 
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_template TEXT DEFAULT 'promotional_campaign',
  ADD COLUMN IF NOT EXISTS send_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS send_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounce_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fail_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.email_campaign_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage campaign logs"
  ON public.email_campaign_logs
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_email_campaign_logs_campaign_id ON public.email_campaign_logs(campaign_id);
CREATE INDEX idx_email_campaign_logs_status ON public.email_campaign_logs(status);
CREATE INDEX idx_email_campaign_logs_user_id ON public.email_campaign_logs(user_id);

-- Enable realtime for campaign status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_campaign_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_campaigns;
