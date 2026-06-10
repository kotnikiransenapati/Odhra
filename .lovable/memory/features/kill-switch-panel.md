---
name: Kill Switch Panel
description: Admin-only one-click feature kill switches with audit logging, instantly enforced by edge functions via is_kill_switch_active.
type: feature
---
**Table**: `public.kill_switches (key PK, label, description, category, is_enabled, reason, toggled_by, toggled_at)`. Public read so the storefront can hide disabled features; writes restricted to active admins.

**Seeded keys** (categories): `checkout` (commerce); `razorpay_payments`, `cod_orders` (payments); `signups` (auth); `ai_chatbot` (ai); `email_campaigns`, `push_notifications`, `whatsapp_outbound` (marketing); `vendor_onboarding` (vendor); `reviews_submit` (content); `referrals`, `loyalty_redeem` (rewards).

**RPCs**:
- `is_kill_switch_active(_key)` — STABLE, fast lookup, granted to anon/authenticated/service_role. Returns `true` when the switch exists and `is_enabled=false`.
- `toggle_kill_switch(_key, _enabled, _reason)` — admin-only; updates row + inserts `audit_logs` entry (`killswitch.enable`/`killswitch.disable`). Requires non-empty reason when disabling (enforced in UI).

**UI**: `src/components/admin/KillSwitchPanel.tsx` — grouped by category, switches gated by an AlertDialog that requires a reason on disable. Realtime subscribed to `kill_switches` for live updates. Mounted in `AdminDashboard.tsx` at **Admin → System → Kill Switches** (`manage_feature_flags` permission).

**Edge integration**: call `assertKillSwitchInactive(admin, 'checkout')` early in handlers (see `_shared/idempotency.ts`).
