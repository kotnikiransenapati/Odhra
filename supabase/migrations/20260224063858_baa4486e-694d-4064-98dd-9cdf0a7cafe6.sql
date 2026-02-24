
-- The trigger and function were created successfully in the previous migration.
-- Now just add the missing upload/update/delete policies (SELECT already exists).

-- Drop if they exist to avoid conflicts, then recreate
DO $$
BEGIN
  -- Drop existing policies if they exist to avoid errors
  DROP POLICY IF EXISTS "Authenticated users can upload vendor assets" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own vendor assets" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own vendor assets" ON storage.objects;
END $$;

CREATE POLICY "Authenticated users can upload vendor assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vendor-assets');

CREATE POLICY "Users can update their own vendor assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vendor-assets');

CREATE POLICY "Users can delete their own vendor assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vendor-assets');
