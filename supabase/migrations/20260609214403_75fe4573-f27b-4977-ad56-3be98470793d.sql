ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_recipient_name text,
  ADD COLUMN IF NOT EXISTS gift_message text,
  ADD COLUMN IF NOT EXISTS gift_wrap_fee numeric(10,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.validate_order_gift_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_gift = false THEN
    NEW.gift_recipient_name := NULL;
    NEW.gift_message := NULL;
    NEW.gift_wrap_fee := 0;
  ELSE
    IF NEW.gift_message IS NOT NULL AND length(NEW.gift_message) > 280 THEN
      RAISE EXCEPTION 'gift_message must be 280 characters or fewer';
    END IF;
    IF NEW.gift_wrap_fee < 0 OR NEW.gift_wrap_fee > 500 THEN
      RAISE EXCEPTION 'gift_wrap_fee must be between 0 and 500';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_gift_fields ON public.orders;
CREATE TRIGGER trg_validate_order_gift_fields
  BEFORE INSERT OR UPDATE OF is_gift, gift_recipient_name, gift_message, gift_wrap_fee
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_gift_fields();

CREATE INDEX IF NOT EXISTS idx_orders_is_gift ON public.orders(customer_id, created_at DESC) WHERE is_gift = true;