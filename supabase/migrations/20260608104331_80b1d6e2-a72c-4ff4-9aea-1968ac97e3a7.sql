
-- Phase 3 P0 security hardening

-- 1) user_roles: kill self-insert privilege escalation. Only admins / triggers (SECURITY DEFINER) may insert.
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

-- 2) achievements: prevent users forging badges. Awarding happens via SECURITY DEFINER check_and_award_achievements().
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.achievements;

-- 3) loyalty_transactions: prevent users crediting themselves points. Only add_loyalty_points() (SECURITY DEFINER) writes.
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.loyalty_transactions;

-- 4) campaign_links: hide admin_invite tokens/emails from public listing.
--    Public marketing campaigns remain readable; admin invites are admin-only.
--    Deep-link resolution still works via track_campaign_event() SECURITY DEFINER RPC.
DROP POLICY IF EXISTS "Anyone can read active campaign links" ON public.campaign_links;
CREATE POLICY "Anyone can read active marketing links"
  ON public.campaign_links
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND campaign_type <> 'admin_invite');

-- 5) otp_verifications: never expose raw otp_code over the Data API.
--    Verification must run server-side (edge function / SECURITY DEFINER RPC) using service_role.
DROP POLICY IF EXISTS "Users can verify their own OTP" ON public.otp_verifications;
REVOKE SELECT ON public.otp_verifications FROM anon, authenticated;
