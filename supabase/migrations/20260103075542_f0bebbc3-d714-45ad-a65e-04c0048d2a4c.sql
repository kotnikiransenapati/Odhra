-- Create function to increment promotion usage count
CREATE OR REPLACE FUNCTION public.increment_promotion_usage(promo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promotions 
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = promo_id;
END;
$$;