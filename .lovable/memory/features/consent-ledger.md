---
name: Consent Ledger
description: GDPR/CCPA consent audit trail with grant/revoke history per user or visitor
type: feature
---
- Table: `public.consent_ledger` (user_id OR visitor_hash, consent_type, version, granted, source, ip/UA hashes, evidence jsonb).
- RLS: self read+insert, admin read via `manage_admins`, service_role all. Indexes on (user,type,date), (type,date), visitor_hash.
- RPCs (SECURITY DEFINER):
  - `record_consent(...)` — authenticated or anon (requires visitor_hash), stamps user from `auth.uid()`.
  - `latest_consent(_user,_type)` — current state.
  - `admin_consent_stats(_days)` — totals/grant rate, top types, top sources.
  - `admin_consent_feed(_limit,_type,_only_revoked)` — paginated audit feed (joins auth.users for email).
- UI: `src/components/admin/ConsentLedgerCenter.tsx`, tab id `consent-ledger` (Admin → System). Click a type chip to filter the feed.
