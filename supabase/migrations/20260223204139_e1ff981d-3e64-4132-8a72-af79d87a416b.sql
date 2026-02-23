
-- 1. Function to restore stock when an order is cancelled
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub RECORD;
  item RECORD;
BEGIN
  FOR sub IN SELECT id FROM sub_orders WHERE order_id = p_order_id
  LOOP
    FOR item IN SELECT product_id, quantity FROM order_items WHERE sub_order_id = sub.id
    LOOP
      UPDATE products
      SET stock = stock + item.quantity,
          sold_count = GREATEST(COALESCE(sold_count, 0) - item.quantity, 0)
      WHERE id = item.product_id;
    END LOOP;
  END LOOP;
END;
$$;

-- 2. Atomic points redemption function (prevents race condition)
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_user_id uuid,
  p_points_cost integer,
  p_option_id uuid,
  p_reward_code text,
  p_reward_details jsonb,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_points integer;
  current_tier text;
  redemption_id uuid;
BEGIN
  -- Lock and read current points
  SELECT points, tier INTO current_points, current_tier
  FROM loyalty_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No loyalty record found');
  END IF;

  IF current_points < p_points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points', 'available', current_points);
  END IF;

  -- Deduct points atomically
  UPDATE loyalty_points
  SET points = points - p_points_cost,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO loyalty_transactions (user_id, points, transaction_type, source, description, reference_id)
  VALUES (p_user_id, -p_points_cost, 'redeem', 'redemption', 'Redeemed: ' || (p_reward_details->>'name'), p_option_id);

  -- Create redemption record
  INSERT INTO points_redemptions (user_id, option_id, points_spent, reward_code, reward_details, status, expires_at)
  VALUES (p_user_id, p_option_id, p_points_cost, p_reward_code, p_reward_details, 'active', p_expires_at)
  RETURNING id INTO redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', redemption_id,
    'reward_code', p_reward_code,
    'new_balance', current_points - p_points_cost
  );
END;
$$;
