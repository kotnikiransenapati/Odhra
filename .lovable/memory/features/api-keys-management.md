---
name: API keys management
description: Server-to-server API keys stored as SHA-256 hashes with scopes, expiry, revocation, and one-time plaintext reveal.
type: feature
---
- Table: `api_keys` — `key_prefix` (visible `odk_xxxxxx`), `key_hash` (sha256 of full `prefix.secret` token via `extensions.digest`),
  `scopes[]`, `expires_at`, `last_used_at`, `last_used_ip`, `use_count`, `revoked_at/by`.
- RPCs (`manage_admins`):
  - `admin_create_api_key(name, scopes, description, expires_at)` → returns `{ id, prefix, token }`. Token only shown once.
  - `admin_revoke_api_key(_id)` and `admin_delete_api_key(_id)`.
- Verifier: `api_key_verify(_token, _ip)` — returns row if valid (not revoked, not expired), updates `last_used_*`. Callable by edge functions via service role.
- All actions audit-logged.
- UI: `src/components/admin/ApiKeysManager.tsx` → Admin → System → API Keys. Issued token shown in a one-time dialog.
