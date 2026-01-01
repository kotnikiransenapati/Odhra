-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-assets', 'vendor-assets', true);

-- Product Images Policies
-- Anyone can view product images (public bucket)
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Vendors can upload images to their own folder (folder structure: vendor_id/product_id/filename)
CREATE POLICY "Vendors can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND EXISTS (
    SELECT 1 FROM public.vendors 
    WHERE vendors.user_id = auth.uid() 
    AND vendors.id::text = (storage.foldername(name))[1]
  )
);

-- Vendors can update their own product images
CREATE POLICY "Vendors can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND EXISTS (
    SELECT 1 FROM public.vendors 
    WHERE vendors.user_id = auth.uid() 
    AND vendors.id::text = (storage.foldername(name))[1]
  )
);

-- Vendors can delete their own product images
CREATE POLICY "Vendors can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND EXISTS (
    SELECT 1 FROM public.vendors 
    WHERE vendors.user_id = auth.uid() 
    AND vendors.id::text = (storage.foldername(name))[1]
  )
);

-- Vendor Assets Policies (logos, banners)
-- Anyone can view vendor assets (public bucket)
CREATE POLICY "Anyone can view vendor assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'vendor-assets');

-- Vendors can upload to their own folder (folder structure: vendor_id/filename)
CREATE POLICY "Vendors can upload own assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vendor-assets' 
  AND EXISTS (
    SELECT 1 FROM public.vendors 
    WHERE vendors.user_id = auth.uid() 
    AND vendors.id::text = (storage.foldername(name))[1]
  )
);

-- Vendors can update their own assets
CREATE POLICY "Vendors can update own assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'vendor-assets' 
  AND EXISTS (
    SELECT 1 FROM public.vendors 
    WHERE vendors.user_id = auth.uid() 
    AND vendors.id::text = (storage.foldername(name))[1]
  )
);

-- Vendors can delete their own assets
CREATE POLICY "Vendors can delete own assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vendor-assets' 
  AND EXISTS (
    SELECT 1 FROM public.vendors 
    WHERE vendors.user_id = auth.uid() 
    AND vendors.id::text = (storage.foldername(name))[1]
  )
);

-- Admins can manage all storage objects
CREATE POLICY "Admins can manage all product images"
ON storage.objects FOR ALL
USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'product-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all vendor assets"
ON storage.objects FOR ALL
USING (bucket_id = 'vendor-assets' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'vendor-assets' AND public.is_admin(auth.uid()));