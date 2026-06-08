
-- Batch 5: Lock down SECURITY DEFINER functions exposed to anon
-- For each function: REVOKE EXECUTE from PUBLIC + anon, then GRANT to authenticated and service_role.
-- Re-grant to anon only on functions that are genuinely called pre-auth.

DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'add_loyalty_points',
    'admin_has_permission',
    'audit_order_status_change',
    'audit_product_change',
    'audit_vendor_change',
    'auto_create_refund_on_return_approval',
    'auto_generate_invoice',
    'calculate_bundle_stock',
    'calculate_loyalty_tier',
    'can_manage_admins',
    'can_user_spin',
    'can_view_order_item',
    'check_and_award_achievements',
    'check_order_fraud',
    'compute_inventory_forecasts',
    'compute_product_abandonment_stats',
    'compute_vendor_performance',
    'credit_vendor_wallet_on_delivery',
    'deduct_product_stock',
    'expire_spin_wheel_codes',
    'generate_campaign_code',
    'generate_referral_code',
    'get_admin_permissions',
    'handle_new_user',
    'has_role',
    'increment_promotion_usage',
    'is_admin',
    'is_admin_user',
    'is_order_customer',
    'is_order_vendor',
    'is_vendor',
    'is_vendor_active',
    'log_admin_action',
    'record_price_change',
    'redeem_loyalty_points',
    'refund_lifecycle_trigger',
    'restore_order_stock',
    'update_behavior_profile',
    'update_bundle_stock'
  ];
  sig text;
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    FOR sig IN
      SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn AND p.prosecdef = true
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
    END LOOP;
  END LOOP;
END $$;

-- Keep anon-callable: validate_admin_invite, accept_admin_invite,
-- track_campaign_event, get_dynamic_price, get_cart_recovery_discount,
-- convert_currency, check_rate_limit (called from edge fns w/ service_role,
-- left intact to avoid breakage).
