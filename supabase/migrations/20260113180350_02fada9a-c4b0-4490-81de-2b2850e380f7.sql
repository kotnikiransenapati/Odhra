-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage on cron schema to postgres
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the cart abandonment email job to run every day at 10:00 AM IST (4:30 AM UTC)
SELECT cron.schedule(
  'send-abandoned-cart-emails',
  '30 4 * * *',  -- Every day at 4:30 AM UTC (10:00 AM IST)
  $$
  SELECT net.http_post(
    url := 'https://sckugugzlgoihoviqoid.supabase.co/functions/v1/cart-abandonment-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Also schedule it to run at 6:00 PM IST (12:30 PM UTC) for evening reminder
SELECT cron.schedule(
  'send-abandoned-cart-emails-evening',
  '30 12 * * *',  -- Every day at 12:30 PM UTC (6:00 PM IST)
  $$
  SELECT net.http_post(
    url := 'https://sckugugzlgoihoviqoid.supabase.co/functions/v1/cart-abandonment-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);