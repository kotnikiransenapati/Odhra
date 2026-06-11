---
name: Admin IP allowlist
description: CIDR-based allowlist gating admin access; bypass-safe when no rules exist.
type: feature
---
- Table: `admin_ip_allowlist` (unique cidr, label, optional expires_at).
- Helper `is_admin_ip_allowed(_ip inet)` returns true if **no active rules exist** (bypass) or the IP matches any active non-expired rule.
- RPCs (`manage_admins`): `admin_upsert_ip_allowlist`, `admin_toggle_ip_allowlist`, `admin_delete_ip_allowlist`.
- All mutations audit-logged.
- UI: `src/components/admin/AdminIpAllowlist.tsx` → Admin → System → Admin IP Allowlist (warns when allowlist is empty).
- Wire into edge middleware by calling `is_admin_ip_allowed` with the caller's `x-forwarded-for` first hop.
