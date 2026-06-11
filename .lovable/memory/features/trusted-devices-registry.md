---
name: Trusted Devices Registry
description: Per-user trusted device fingerprints with TTL, revoke, and admin oversight
type: feature
---
- Table: `public.trusted_devices` (user_id, device_fingerprint_hash, label, user_agent, ip_hash, last_seen_at, expires_at, revoked_at). Unique (user, fingerprint).
- RLS: users full CRUD on own, admins SELECT via `admin_has_permission('manage_admins')`, service_role all.
- Helpers (SECURITY DEFINER):
  - `upsert_trusted_device(fingerprint, label, ua, ip_hash, ttl_days=60)` — register or touch (clears revoke, extends expiry).
  - `is_device_trusted(user, fingerprint)` — auth-flow check.
- Admin RPCs: `admin_trusted_devices_stats(_days)`, `admin_trusted_devices_list(_limit,_only_active)`, `admin_revoke_trusted_device(_id)` (audit-logged).
- UI: `src/components/admin/TrustedDevicesRegistry.tsx`, tab id `trusted-devices` (Admin → System), permission `manage_admins`.
