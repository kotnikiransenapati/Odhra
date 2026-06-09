---
name: Reorder Reminders
description: reorder_reminders table lets a customer schedule "remind me every N days" on a product; cron-ready via partial index, with panel + dropdown button.
type: feature
---
- Table `public.reorder_reminders` (user_id, product_id UNIQUE per user, interval_days 7–365, next_remind_at, last_reminded_at, enabled, notes ≤200 chars). RLS: user-only CRUD.
- Trigger `validate_reorder_reminder`: enforces interval bounds + notes length, bumps `updated_at`, and **recomputes `next_remind_at`** on INSERT, when interval_days changes, or when transitioning enabled false→true.
- Partial index `idx_reorder_reminders_due (next_remind_at) WHERE enabled = true` — cron query: `WHERE enabled AND next_remind_at <= now()`. After sending, edge function should set `last_reminded_at = now(), next_remind_at = now() + interval`.
- Hooks: `useReorderReminders`, `useUpsertReorderReminder` (uses upsert with `onConflict: 'user_id,product_id'`), `useUpdateReorderReminder`, `useDeleteReorderReminder`.
- `ReorderReminderButton` (dropdown 7/14/30/60/90 days) intended for ProductDetail. `ReorderRemindersPanel` rendered in CustomerAccount; hides when empty.
