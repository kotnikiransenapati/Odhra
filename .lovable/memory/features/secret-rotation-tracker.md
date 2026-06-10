---
name: Secret Rotation Tracker
description: managed_secrets registry + admin_secrets_status + admin_mark_secret_rotated, admin UI surfaces overdue/due_soon/never_rotated keys
type: feature
---
- Table `managed_secrets(name UNIQUE, category, severity, rotation_interval_days, last_rotated_at, rotation_count, owner_email, notes)`.
- `admin_secrets_status()` returns computed `days_since_rotated`, `days_until_due`, `status` ∈ ok|due_soon|overdue|never_rotated. `due_soon` triggers within 14 days of interval.
- `admin_mark_secret_rotated(_name, _note)` stamps `last_rotated_at = now()`, increments count, writes `secret.rotated` to `audit_logs`.
- Seeded with 10 secrets (Razorpay key/webhook, Delhivery, India Post, Resend, Lovable AI, Google OAuth, Algolia, VAPID, reCAPTCHA).
- UI: `src/components/admin/SecretRotationTracker.tsx` with KPI cards + confirmation dialog.
- Admin route id: `secret-rotation`, permission `manage_admins`.
