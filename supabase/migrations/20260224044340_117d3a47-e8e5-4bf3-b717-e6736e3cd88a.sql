-- Drop the restrictive service_role-only insert policy
DROP POLICY IF EXISTS "Service role can insert error logs" ON public.error_logs;

-- Allow any client (authenticated or anonymous) to insert error logs
CREATE POLICY "Anyone can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);
