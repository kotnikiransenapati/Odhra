-- Recreate function with correct enum value 'sale'
CREATE OR REPLACE FUNCTION public.credit_vendor_wallet_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_payment_status TEXT;
  already_credited BOOLEAN;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    SELECT payment_status INTO order_payment_status
    FROM orders WHERE id = NEW.order_id;
    
    IF order_payment_status IN ('paid', 'cod_pending') THEN
      SELECT EXISTS(
        SELECT 1 FROM wallet_transactions 
        WHERE vendor_id = NEW.vendor_id 
          AND reference_id = NEW.id 
          AND reference_type = 'sub_order'
          AND type = 'sale'
      ) INTO already_credited;
      
      IF NOT already_credited AND NEW.vendor_earnings > 0 THEN
        UPDATE vendors 
        SET balance = balance + NEW.vendor_earnings,
            updated_at = now()
        WHERE id = NEW.vendor_id;
        
        INSERT INTO wallet_transactions (vendor_id, type, amount, balance_after, reference_id, reference_type, description)
        SELECT 
          NEW.vendor_id, 'sale', NEW.vendor_earnings, v.balance,
          NEW.id, 'sub_order', 'Earnings from order ' || NEW.sub_order_number
        FROM vendors v WHERE v.id = NEW.vendor_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_credit_vendor_wallet ON public.sub_orders;
CREATE TRIGGER trigger_credit_vendor_wallet
  AFTER UPDATE ON public.sub_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_vendor_wallet_on_delivery();

-- Backfill existing delivered orders
DO $$
DECLARE
  so RECORD;
  already_credited BOOLEAN;
BEGIN
  FOR so IN 
    SELECT s.*, o.payment_status 
    FROM sub_orders s 
    JOIN orders o ON o.id = s.order_id 
    WHERE s.status = 'delivered' 
      AND o.payment_status IN ('paid', 'cod_pending')
      AND s.vendor_earnings > 0
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM wallet_transactions 
      WHERE vendor_id = so.vendor_id 
        AND reference_id = so.id 
        AND reference_type = 'sub_order'
        AND type = 'sale'
    ) INTO already_credited;
    
    IF NOT already_credited THEN
      UPDATE vendors 
      SET balance = balance + so.vendor_earnings, updated_at = now()
      WHERE id = so.vendor_id;
      
      INSERT INTO wallet_transactions (vendor_id, type, amount, balance_after, reference_id, reference_type, description)
      SELECT so.vendor_id, 'sale', so.vendor_earnings, v.balance,
        so.id, 'sub_order', 'Earnings from order ' || so.sub_order_number
      FROM vendors v WHERE v.id = so.vendor_id;
    END IF;
  END LOOP;
END;
$$;
