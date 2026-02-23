-- Fix overly permissive INSERT on analytics_events — require authentication
DROP POLICY IF EXISTS "Authenticated users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated users can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix overly permissive INSERT on user_behavior_events
DROP POLICY IF EXISTS "Service role can insert behavior events" ON public.user_behavior_events;
CREATE POLICY "Authenticated users can insert behavior events"
ON public.user_behavior_events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);