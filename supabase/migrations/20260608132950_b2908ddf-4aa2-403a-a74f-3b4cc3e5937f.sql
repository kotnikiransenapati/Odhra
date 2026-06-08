
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (email IS NOT NULL AND length(trim(email)) > 3 AND email LIKE '%@%');

DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions
  FOR INSERT WITH CHECK (
    name IS NOT NULL AND length(trim(name)) > 0
    AND email IS NOT NULL AND email LIKE '%@%'
    AND message IS NOT NULL AND length(trim(message)) > 0
  );

DROP POLICY IF EXISTS "Anyone can create shared carts" ON public.shared_carts;
CREATE POLICY "Anyone can create shared carts" ON public.shared_carts
  FOR INSERT WITH CHECK (
    items IS NOT NULL
    AND share_code IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  );

DROP POLICY IF EXISTS "Anyone can update shared cart stats" ON public.shared_carts;
CREATE POLICY "Anyone can update shared cart stats" ON public.shared_carts
  FOR UPDATE USING (expires_at IS NULL OR expires_at > now())
  WITH CHECK (expires_at IS NULL OR expires_at > now());

DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Anyone can insert error logs" ON public.error_logs
  FOR INSERT WITH CHECK (
    message IS NOT NULL AND length(message) > 0 AND length(message) < 10000
  );

DROP POLICY IF EXISTS "Anyone can insert behavior events" ON public.user_behavior_events;
CREATE POLICY "Anyone can insert behavior events" ON public.user_behavior_events
  FOR INSERT WITH CHECK (
    event_type IS NOT NULL AND length(event_type) > 0 AND length(event_type) <= 100
  );

DROP POLICY IF EXISTS "Anyone can insert campaign events" ON public.campaign_link_events;
CREATE POLICY "Anyone can insert campaign events" ON public.campaign_link_events
  FOR INSERT WITH CHECK (
    event_type IS NOT NULL
    AND event_type IN ('click','view','signup','purchase','conversion','dismiss')
  );

DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
CREATE POLICY "Product images listing restricted to admins" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view vendor assets" ON storage.objects;
CREATE POLICY "Vendor assets listing restricted to admins/owners" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vendor-assets' AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.user_id = auth.uid()
          AND v.id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS "Review images are publicly accessible" ON storage.objects;
CREATE POLICY "Review images listing restricted to owner/admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'review-images' AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
