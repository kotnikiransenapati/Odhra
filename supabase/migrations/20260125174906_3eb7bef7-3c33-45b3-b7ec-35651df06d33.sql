-- PHASE 1: Security Hardening - Fix overly permissive RLS policies

-- 1. Fix banner_ab_analytics - require session_id or user_id for inserts
DROP POLICY IF EXISTS "Anyone can insert banner analytics" ON public.banner_ab_analytics;
CREATE POLICY "Validated banner analytics inserts"
ON public.banner_ab_analytics
FOR INSERT
WITH CHECK (
  -- Must have either a session_id or be an authenticated user
  (session_id IS NOT NULL AND length(session_id) > 10) 
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- 2. Fix otp_verifications - restrict to service role for creation
DROP POLICY IF EXISTS "OTP can only be created and verified" ON public.otp_verifications;
CREATE POLICY "Service role can create OTP"
ON public.otp_verifications
FOR INSERT
WITH CHECK (
  -- Only service role can create OTP records (edge functions use service role)
  (auth.jwt() ->> 'role') = 'service_role'
);

-- 3. Fix whatsapp_messages - restrict inserts to service role
DROP POLICY IF EXISTS "System can insert WhatsApp messages" ON public.whatsapp_messages;
CREATE POLICY "Service role can insert WhatsApp messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (
  -- Only service role (edge functions) can insert messages
  (auth.jwt() ->> 'role') = 'service_role'
);

-- 4. Add missing DELETE policy restrictions where needed
-- Ensure cookie_consents can only be deleted by the owner
CREATE POLICY "Users can delete their own cookie consent"
ON public.cookie_consents
FOR DELETE
USING (
  (auth.uid() = user_id) 
  OR (session_id IS NOT NULL AND user_id IS NULL)
);

-- 5. Create error_logs table for centralized error monitoring
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_level TEXT NOT NULL DEFAULT 'error', -- 'info', 'warn', 'error', 'critical'
  error_code TEXT,
  message TEXT NOT NULL,
  stack_trace TEXT,
  source TEXT, -- 'edge_function', 'client', 'database'
  function_name TEXT,
  user_id UUID, -- anonymized, just for correlation
  request_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on error_logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view error logs
CREATE POLICY "Admins can view error logs"
ON public.error_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Service role can insert error logs (from edge functions)
CREATE POLICY "Service role can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 6. Create rate_limits table for API rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user_id
  identifier_type TEXT NOT NULL DEFAULT 'ip', -- 'ip', 'user', 'api_key'
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.rate_limits(identifier, endpoint, window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role manages rate limits"
ON public.rate_limits
FOR ALL
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 7. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 60,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
  result JSONB;
BEGIN
  window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Get current request count in window
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at > window_start;
  
  -- Check if over limit
  IF current_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', current_count,
      'limit', p_max_requests,
      'retry_after', p_window_seconds
    );
  END IF;
  
  -- Log this request
  INSERT INTO rate_limits (identifier, endpoint, request_count)
  VALUES (p_identifier, p_endpoint, 1);
  
  -- Clean up old records (older than 1 hour)
  DELETE FROM rate_limits WHERE created_at < now() - interval '1 hour';
  
  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', current_count + 1,
    'limit', p_max_requests,
    'remaining', p_max_requests - current_count - 1
  );
END;
$$;