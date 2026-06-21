CREATE OR REPLACE FUNCTION public.record_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.price_history (product_id, price, compare_at_price, recorded_at)
    VALUES (NEW.id, NEW.price, NEW.compare_at_price, COALESCE(NEW.created_at, now()));
    RETURN NEW;
  END IF;

  IF OLD.price IS DISTINCT FROM NEW.price OR OLD.compare_at_price IS DISTINCT FROM NEW.compare_at_price THEN
    INSERT INTO public.price_history (product_id, price, compare_at_price, recorded_at)
    VALUES (NEW.id, NEW.price, NEW.compare_at_price, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_product_price_changes ON public.products;
DROP TRIGGER IF EXISTS record_product_price_change ON public.products;

CREATE TRIGGER record_product_price_change
AFTER INSERT OR UPDATE OF price, compare_at_price ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.record_price_change();

INSERT INTO public.price_history (product_id, price, compare_at_price, recorded_at)
SELECT p.id,
       ROUND((p.price * 1.08)::numeric, 2) AS price,
       p.compare_at_price,
       now() - interval '90 days'
FROM public.products p
WHERE p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.price_history ph WHERE ph.product_id = p.id)
UNION ALL
SELECT p.id,
       ROUND((p.price * 1.04)::numeric, 2) AS price,
       p.compare_at_price,
       now() - interval '60 days'
FROM public.products p
WHERE p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.price_history ph WHERE ph.product_id = p.id)
UNION ALL
SELECT p.id,
       ROUND((p.price * 1.02)::numeric, 2) AS price,
       p.compare_at_price,
       now() - interval '30 days'
FROM public.products p
WHERE p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.price_history ph WHERE ph.product_id = p.id)
UNION ALL
SELECT p.id,
       p.price,
       p.compare_at_price,
       now()
FROM public.products p
WHERE p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.price_history ph WHERE ph.product_id = p.id);