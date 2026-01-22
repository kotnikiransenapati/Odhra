-- Fix overly permissive RLS policies for referrals table
-- Drop the problematic policies first
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;

-- Create more secure policies
-- Allow authenticated users to insert referrals where they are the referred user
CREATE POLICY "Users can be referred" 
ON public.referrals 
FOR INSERT 
WITH CHECK (auth.uid() = referred_id OR is_admin(auth.uid()));

-- Allow updates only by admins or the system (via service role)
-- Users should not be able to manually complete their own referrals
CREATE POLICY "Admins can update referrals" 
ON public.referrals 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Also add service role access for edge functions
CREATE POLICY "Service role can manage referrals"
ON public.referrals
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');