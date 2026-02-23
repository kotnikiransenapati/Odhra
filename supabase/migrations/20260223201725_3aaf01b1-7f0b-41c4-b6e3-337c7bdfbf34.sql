
-- Atomic stock deduction with row-level locking to prevent overselling
CREATE OR REPLACE FUNCTION public.deduct_product_stock(
  p_product_id uuid,
  p_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_stock INTEGER;
  current_sold INTEGER;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT stock, COALESCE(sold_count, 0) INTO current_stock, current_sold
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  IF current_stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock', 'available', current_stock);
  END IF;

  UPDATE products
  SET stock = current_stock - p_quantity,
      sold_count = current_sold + p_quantity
  WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true, 'new_stock', current_stock - p_quantity);
END;
$$;

-- Add idempotency key column to orders table to prevent duplicate orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- Create index for faster idempotency lookups
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
