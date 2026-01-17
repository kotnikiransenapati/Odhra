-- Fix overly permissive cookie consent INSERT policy
DROP POLICY IF EXISTS "Anyone can create cookie consent" ON public.cookie_consents;

CREATE POLICY "Users can create their own cookie consent"
ON public.cookie_consents FOR INSERT
WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
    (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
);