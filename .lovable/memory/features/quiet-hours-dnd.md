---
name: Quiet Hours / Do-Not-Disturb
description: email_preferences extended with dnd_enabled + quiet_hours_start/end + timezone; is_in_quiet_hours(user_id) helper suppresses promotional notifications; QuietHoursPanel UI
type: feature
---
Phase E Batch 4 (customer panel).

**Migration**: extended `public.email_preferences` with `dnd_enabled boolean`, `quiet_hours_start time`, `quiet_hours_end time`, `timezone text` (default `Asia/Kolkata`). Added `public.is_in_quiet_hours(_user_id uuid)` SECURITY DEFINER stable function that:
- Returns false when DND off or no preference row.
- Computes `(now() AT TIME ZONE pref.timezone)::time` and supports overnight windows (start > end wraps past midnight).
- Falls back to Asia/Kolkata on invalid timezone strings.

Edge functions that broadcast marketing pushes / promotional emails / WhatsApp drips should `await admin.rpc('is_in_quiet_hours', { _user_id: userId })` and skip when true. Order, shipping, and security alerts MUST bypass this check.

**QuietHoursPanel** (`src/components/customer/QuietHoursPanel.tsx`):
- Single-toggle DND switch, time-range inputs, and IANA timezone selector (7 presets).
- Autosaves on every change via upsert into `email_preferences` (onConflict `user_id`). Saving spinner in header, haptic feedback on success/error.
- Disabled state for time/tz inputs when DND off (opacity 50 + pointer-events-none).

Surfaced in `CustomerAccount` alongside the privacy section.
