-- First, check if the constraint exists and drop it if it does
DO $$
BEGIN
  -- Drop the FK constraint if it exists (the constraint may have a different name)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vendors_user_id_fkey' AND table_name = 'vendors'
  ) THEN
    ALTER TABLE public.vendors DROP CONSTRAINT vendors_user_id_fkey;
  END IF;
END $$;

-- Make user_id nullable for seeding purposes
ALTER TABLE public.vendors ALTER COLUMN user_id DROP NOT NULL;