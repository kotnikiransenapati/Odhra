---
name: CAPTCHA Verification Monitor
description: reCAPTCHA verification telemetry with per-action success/score breakdown
type: feature
---
- Table: `public.captcha_verifications` (provider, action, success, score, threshold, hostname, ip_hash, user_id, error_codes[], metadata).
- RLS: anon+authenticated INSERT (logging from edge/client), admin SELECT via `admin_has_permission('view_error_monitoring')`, service_role all.
- Admin RPCs: `admin_captcha_stats(_days)` returns totals, success/fail, avg score, low_score count, and per-action rollup; `admin_captcha_recent(_limit,_only_failed)`.
- UI: `src/components/admin/CaptchaVerificationMonitor.tsx`, tab id `captcha-monitor` (Admin → System). Failure rate ≥ 10% surfaces a destructive banner.
