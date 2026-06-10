---
name: Signed Download Service
description: signed-download edge function mints short-lived (60-3600s) signed URLs for private storage buckets with per-bucket ownership rules + audit log
type: feature
---
Endpoint: `POST /functions/v1/signed-download`
Body: `{ bucket, path, expiresIn? }` validated via `schemas`-style Zod (enum bucket whitelist).
Pipeline: `withEnvelope` → `validateBody` → JWT `getClaims` → admin check → per-bucket `authorize()` → `createSignedUrl({download:true})` → `audit_logs` insert (action=`storage.signed_download`).

Per-bucket rules:
- `avatars`, `review-images`: path must start with `<user_id>/`
- `vendor-documents`: caller must own the vendor row; path must start with `<vendor_id>/` or `vendor-<vendor_id>/`
- `product-images`, `vendor-assets`: any authenticated user (public buckets, signed URL forces download)
- Active admins bypass all rules

Uses `_shared/errorEnvelope.ts` (uniform `{ok,data|error,request_id}`) and `_shared/piiRedaction.ts` for denied-access log lines.
