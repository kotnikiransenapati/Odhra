
-- Fix #1: Move referral application to handle_new_user trigger (SECURITY DEFINER)
-- This runs server-side with full permissions when a user is created, 
-- so RLS doesn't block the operations.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_code TEXT;
  ref_code_record RECORD;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Process referral code from signup metadata
  ref_code := upper(trim(COALESCE(NEW.raw_user_meta_data ->> 'referral_code', '')));
  
  IF ref_code != '' THEN
    -- Look up the referral code
    SELECT * INTO ref_code_record
    FROM public.referral_codes
    WHERE code = ref_code AND is_active = true;
    
    IF FOUND AND ref_code_record.user_id != NEW.id THEN
      -- Check if this user hasn't already been referred
      IF NOT EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
        -- Create the pending referral
        INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status, referrer_reward, referred_reward)
        VALUES (ref_code_record.user_id, NEW.id, ref_code, 'pending', 100, 50);
        
        -- Update referral code stats
        UPDATE public.referral_codes
        SET total_referrals = COALESCE(total_referrals, 0) + 1
        WHERE id = ref_code_record.id;
        
        -- Award welcome bonus to the new user
        PERFORM public.add_loyalty_points(
          NEW.id, 50, 'referral_bonus', 
          'Welcome bonus for using referral code ' || ref_code
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix #2: Allow anyone to read referral_codes by code (needed for validation)
-- Currently only the owner can read their own code, but we need to validate codes
CREATE POLICY "Anyone can look up active referral codes by code"
  ON public.referral_codes
  FOR SELECT
  USING (is_active = true);

-- Drop the old restrictive policy since the new one is a superset for active codes
-- (keep admin and user policies for inactive codes)
