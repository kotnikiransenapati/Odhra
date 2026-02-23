
-- Add cart abandonment step tracking
ALTER TABLE public.cart_abandonment_events 
ADD COLUMN IF NOT EXISTS email_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_email_at timestamptz,
ADD COLUMN IF NOT EXISTS recovery_url text,
ADD COLUMN IF NOT EXISTS recovery_code text;

-- Create review-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for review images
CREATE POLICY "Review images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-images');

-- Authenticated users can upload review images  
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'review-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own review images
CREATE POLICY "Users can delete own review images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'review-images' AND (storage.foldername(name))[1] = auth.uid()::text);
