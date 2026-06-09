---
name: Reorder Reminder Cron Pipeline
description: process-reorder-reminders edge function (verify_jwt=false) batches up to 200 due reminders, fires in-app notification + best-effort Resend email, advances next_remind_at.
type: feature
---
- Endpoint: `process-reorder-reminders` (registered in `supabase/config.toml`).
- Schedule via cron (every ~15 min) — must be wired in the dashboard/cron config; idempotent per row (fail = no advance).
- Per row: inserts into `notifications` (`type='reorder_reminder'`, data contains `product_id`, `href`, `reminder_id`), then if `RESEND_API_KEY` is set, emails the user via Resend.
- Uses `supabase.auth.admin.getUserById` to look up email (avoids leaking emails into the public API).
- Advances `last_reminded_at = now()` and `next_remind_at = now() + interval_days * 1d`. Pure additive — no skip-ahead, so a missed cron tick still results in a single delayed send.
