---
name: Two-Factor Policy Center
description: Per-role 2FA enforcement, allowed methods, and enrollment registry
type: feature
---
- Tables:
  - `public.two_factor_policies` (unique `target_role` in admin|vendor|customer; `required`, `allowed_methods text[]`, `grace_period_days`, `enforce_after`, `notes`).
  - `public.two_factor_enrollments` (user_id × method unique; method in totp|webauthn|sms|email; verified, last_used_at).
- RLS:
  - Policies manageable only with `manage_admins`.
  - Enrollments: users manage their own; admins with `manage_admins` can read.
- Helpers / RPCs (SECURITY DEFINER):
  - `is_two_factor_required(_role)` — auth flow hook, respects `enforce_after`.
  - `admin_two_factor_policies_list()`, `admin_upsert_two_factor_policy(...)` (audit-logged).
  - `admin_two_factor_enrollments(_limit)` — joins auth.users for email.
  - `admin_reset_two_factor_enrollment(_id)` — deletes the row, forces re-enroll (audit-logged).
- Seeded with optional defaults for admin/vendor/customer (all `required=false`).
- UI: `src/components/admin/TwoFactorPolicyCenter.tsx`, tab id `two-factor-policies` (Admin → System). Tabs: Policies / Enrollments.
