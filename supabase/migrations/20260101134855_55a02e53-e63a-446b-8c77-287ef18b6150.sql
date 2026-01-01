-- Fix security warnings: set search_path on remaining functions

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_vendor_slug(brand_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  base_slug := lower(regexp_replace(brand_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.vendors WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;