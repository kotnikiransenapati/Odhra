---
name: Login security center
description: Failed login tracking, brute-force auto-lockout, manual IP/email locks with audit logging.
type: feature
---
- Tables: `login_attempts` (hashed email + hashed IP, success, failure_reason, user_agent) and
  `login_lockouts` (unique per identifier_type+hash, auto-clears at `locked_until`).
- Helper `record_login_attempt(email, ip, success, reason, ua)` writes the attempt and auto-creates a
  30-minute IP lockout after 5+ failed attempts in 15 minutes.
- Helper `is_identifier_locked(type, value)` for edge auth checks.
- RPCs (`manage_admins`): `admin_login_security_stats(_hours)`, `admin_recent_login_attempts`,
  `admin_login_lockouts_list`, `admin_unlock_identifier`, `admin_lock_identifier`.
- PII protection: only SHA-256 hashes are stored for email/ip; raw IP kept as `inet` only when parseable.
- UI: `src/components/admin/LoginSecurityCenter.tsx` → Admin → System → Login Security.
