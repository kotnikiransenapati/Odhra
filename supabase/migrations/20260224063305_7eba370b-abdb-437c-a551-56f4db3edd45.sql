-- Allow authenticated users to create their own vendor record during onboarding
CREATE POLICY "Users can create own vendor application"
  ON public.vendors
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);