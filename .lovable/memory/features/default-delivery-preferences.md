---
name: Default Delivery Preferences
description: profiles extended with delivery_instructions/leave_unattended/preferred_delivery_window; DeliveryPreferencesPanel auto-saves; validated by trg_validate_profile_delivery_prefs
type: feature
---
Phase E Batch 5 (customer panel).

**Migration**: extended `public.profiles` with `delivery_instructions text` (max 280 chars), `leave_unattended boolean default false`, `preferred_delivery_window text default 'any'`. Validation handled by trigger `trg_validate_profile_delivery_prefs` (NOT a CHECK constraint, per project rule — keeps rule evolvable). Window must be one of `any|morning|afternoon|evening|weekend`.

**DeliveryPreferencesPanel** (`src/components/customer/DeliveryPreferencesPanel.tsx`):
- Auto-save on change via `profiles` update. Empty notes persisted as NULL.
- Textarea hard-capped at 280 chars (matches DB rule) with live counter.
- Window Select with 5 presets matching DB enum.
- Contactless-drop switch.
- Surfaced in CustomerAccount alongside QuietHoursPanel.

Checkout consumers should `SELECT delivery_instructions, leave_unattended, preferred_delivery_window FROM profiles` and pass them as defaults to the per-order shipping snapshot stored on `orders` / `sub_orders`.
