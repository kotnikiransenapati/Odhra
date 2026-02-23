
-- Make customer_id nullable to support guest orders
ALTER TABLE public.orders ALTER COLUMN customer_id DROP NOT NULL;
