
-- 1) price_watches table
CREATE TABLE IF NOT EXISTS public.price_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price numeric(12,2) NOT NULL CHECK (target_price > 0),
  baseline_price numeric(12,2) NOT NULL,
  notified_at timestamptz,
  notified_price numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_watches_user ON public.price_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_price_watches_product ON public.price_watches(product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_watches TO authenticated;
GRANT ALL ON public.price_watches TO service_role;

ALTER TABLE public.price_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own price watches"
ON public.price_watches
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER trg_price_watches_updated_at
BEFORE UPDATE ON public.price_watches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Trigger on products: when price drops, notify matching watchers
CREATE OR REPLACE FUNCTION public.notify_price_drop_watchers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  watcher RECORD;
BEGIN
  IF NEW.price IS NULL OR OLD.price IS NULL OR NEW.price >= OLD.price THEN
    RETURN NEW;
  END IF;

  FOR watcher IN
    SELECT pw.id, pw.user_id, pw.target_price
    FROM public.price_watches pw
    WHERE pw.product_id = NEW.id
      AND NEW.price <= pw.target_price
      AND (pw.notified_at IS NULL OR pw.notified_price IS NULL OR NEW.price < pw.notified_price)
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, data)
    VALUES (
      watcher.user_id,
      'Price drop alert',
      COALESCE(NEW.title, 'A watched product') || ' is now ₹' || NEW.price::text,
      'price_drop',
      jsonb_build_object('product_id', NEW.id, 'price', NEW.price, 'target_price', watcher.target_price)
    );
    UPDATE public.price_watches
      SET notified_at = now(), notified_price = NEW.price
      WHERE id = watcher.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_price_drop_watchers ON public.products;
CREATE TRIGGER trg_notify_price_drop_watchers
AFTER UPDATE OF price ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_price_drop_watchers();
