---
name: Admin Session Activity Tracker
description: Logs admin login sessions with IP/country/UA, auto-flags suspicious country or IP changes, supports force-revoke from admin UI
type: feature
---
- Table `admin_session_activity` (admin_user_id, session_token_hash, ip_address, country, user_agent, is_suspicious, suspicious_reason, revoked_at, revoked_by, last_seen_at).
- Indexes on (admin_user_id, last_seen_at desc) and partial (is_suspicious) for fast triage.
- `admin_record_admin_session(_session_token_hash, _ip, _country, _ua)` compares vs latest row for same admin and flags `country_change:X->Y` or `ip_change` as suspicious_reason. Called on admin login from client.
- `admin_list_admin_sessions(_only_active, _limit)` returns sessions visible to admins (RLS + has_role check).
- `admin_revoke_admin_session(_session_id)` marks `revoked_at=now()`, audit-logs action `admin_session_revoked`.
- Admin UI: `AdminSessionActivity.tsx` mounted at tab `admin-sessions` under `manage_admins`. KPI cards (total/active/suspicious), suspicious rows tinted `bg-destructive/5`.
