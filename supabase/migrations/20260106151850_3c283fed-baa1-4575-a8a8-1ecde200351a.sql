-- Create table to track user spin eligibility
CREATE TABLE public.spin_wheel_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  promotion_id UUID REFERENCES public.promotions(id),
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, used, expired
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  order_id UUID REFERENCES public.orders(id),
  qualifying_order_id UUID REFERENCES public.orders(id), -- The order >= 999 that unlocked this spin
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spin_wheel_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own entries
CREATE POLICY "Users can view their own spin entries"
ON public.spin_wheel_entries
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own entries (when spinning)
CREATE POLICY "Users can create their own spin entries"
ON public.spin_wheel_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries (when using code)
CREATE POLICY "Users can update their own spin entries"
ON public.spin_wheel_entries
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all entries
CREATE POLICY "Admins can view all spin entries"
ON public.spin_wheel_entries
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can update all entries
CREATE POLICY "Admins can update all spin entries"
ON public.spin_wheel_entries
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_spin_wheel_entries_user_id ON public.spin_wheel_entries(user_id);
CREATE INDEX idx_spin_wheel_entries_code ON public.spin_wheel_entries(code);
CREATE INDEX idx_spin_wheel_entries_status ON public.spin_wheel_entries(status);
CREATE INDEX idx_spin_wheel_entries_expires_at ON public.spin_wheel_entries(expires_at);

-- Function to check if user can spin
CREATE OR REPLACE FUNCTION public.can_user_spin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_entry RECORD;
  last_used_order RECORD;
  qualifying_order RECORD;
  entry_count INTEGER;
BEGIN
  -- Check for any active (non-expired, non-used) spin entry
  SELECT * INTO active_entry
  FROM public.spin_wheel_entries
  WHERE user_id = p_user_id
    AND status = 'active'
    AND expires_at > now()
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'can_spin', false,
      'reason', 'active_code',
      'code', active_entry.code,
      'expires_at', active_entry.expires_at,
      'discount_value', active_entry.discount_value,
      'discount_type', active_entry.discount_type
    );
  END IF;
  
  -- Check total spin count (first spin is free for new users)
  SELECT COUNT(*) INTO entry_count
  FROM public.spin_wheel_entries
  WHERE user_id = p_user_id;
  
  -- If user has never spun, they get one free spin
  IF entry_count = 0 THEN
    RETURN jsonb_build_object('can_spin', true, 'reason', 'first_spin');
  END IF;
  
  -- Find the last spin entry that was used
  SELECT swe.* INTO last_used_order
  FROM public.spin_wheel_entries swe
  WHERE swe.user_id = p_user_id
    AND swe.status = 'used'
  ORDER BY swe.used_at DESC
  LIMIT 1;
  
  -- Check if there's a qualifying order (>= 999) after the last used spin
  IF last_used_order IS NOT NULL THEN
    SELECT * INTO qualifying_order
    FROM public.orders
    WHERE customer_id = p_user_id
      AND total_amount >= 999
      AND payment_status = 'paid'
      AND created_at > last_used_order.used_at
      AND id NOT IN (
        SELECT qualifying_order_id FROM public.spin_wheel_entries 
        WHERE qualifying_order_id IS NOT NULL AND user_id = p_user_id
      )
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    -- Check for qualifying order after any previous spin
    SELECT o.* INTO qualifying_order
    FROM public.orders o
    WHERE o.customer_id = p_user_id
      AND o.total_amount >= 999
      AND o.payment_status = 'paid'
      AND o.id NOT IN (
        SELECT qualifying_order_id FROM public.spin_wheel_entries 
        WHERE qualifying_order_id IS NOT NULL AND user_id = p_user_id
      )
    ORDER BY o.created_at ASC
    LIMIT 1;
  END IF;
  
  IF qualifying_order IS NOT NULL THEN
    RETURN jsonb_build_object(
      'can_spin', true,
      'reason', 'qualifying_order',
      'qualifying_order_id', qualifying_order.id,
      'qualifying_order_amount', qualifying_order.total_amount
    );
  END IF;
  
  -- Check if last entry expired (not used)
  SELECT * INTO active_entry
  FROM public.spin_wheel_entries
  WHERE user_id = p_user_id
    AND status = 'expired'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Check for qualifying order after expired entry
    SELECT o.* INTO qualifying_order
    FROM public.orders o
    WHERE o.customer_id = p_user_id
      AND o.total_amount >= 999
      AND o.payment_status = 'paid'
      AND o.created_at > active_entry.created_at
      AND o.id NOT IN (
        SELECT qualifying_order_id FROM public.spin_wheel_entries 
        WHERE qualifying_order_id IS NOT NULL AND user_id = p_user_id
      )
    ORDER BY o.created_at ASC
    LIMIT 1;
    
    IF qualifying_order IS NOT NULL THEN
      RETURN jsonb_build_object(
        'can_spin', true,
        'reason', 'qualifying_order_after_expired',
        'qualifying_order_id', qualifying_order.id
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'can_spin', false,
    'reason', 'no_qualifying_order',
    'required_order_amount', 999
  );
END;
$$;

-- Function to expire old spin codes (to be called by cron)
CREATE OR REPLACE FUNCTION public.expire_spin_wheel_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.spin_wheel_entries
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;