
-- Price history tracking for price drop alerts
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  compare_at_price NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_product ON public.price_history(product_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read price history (public data)
CREATE POLICY "Price history is publicly readable" ON public.price_history FOR SELECT USING (true);

-- Only system/admin can insert (via triggers or admin)
CREATE POLICY "Admin can insert price history" ON public.price_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
);

-- Trigger to auto-record price changes
CREATE OR REPLACE FUNCTION public.record_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price OR OLD.compare_at_price IS DISTINCT FROM NEW.compare_at_price THEN
    INSERT INTO public.price_history (product_id, price, compare_at_price)
    VALUES (NEW.id, NEW.price, NEW.compare_at_price);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER track_product_price_changes
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.record_price_change();

-- Cart abandonment tracking table
CREATE TABLE public.cart_abandonment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cart_snapshot JSONB NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  recovered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_abandonment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart abandonment events" ON public.cart_abandonment_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert cart abandonment events" ON public.cart_abandonment_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Share & earn discount tracking
CREATE TABLE public.share_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sharer_user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  share_code TEXT NOT NULL UNIQUE DEFAULT 'SHARE' || substr(md5(random()::text), 1, 6),
  platform TEXT NOT NULL DEFAULT 'link',
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  reward_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.share_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own share rewards" ON public.share_rewards FOR SELECT USING (auth.uid() = sharer_user_id);
CREATE POLICY "Users can create share rewards" ON public.share_rewards FOR INSERT WITH CHECK (auth.uid() = sharer_user_id);
CREATE POLICY "Users can update own share rewards" ON public.share_rewards FOR UPDATE USING (auth.uid() = sharer_user_id);

-- Enable realtime for price_history (for wishlist price drop alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;
