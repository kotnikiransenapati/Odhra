---
name: Privacy & GDPR Self-Service
description: PrivacyDataPanel surfaces user-facing data export + account deletion via gdpr-data-export and gdpr-account-deletion edge functions
type: feature
---
Phase E Batch 3 (customer panel).

`src/components/customer/PrivacyDataPanel.tsx`:
- Export: calls `gdpr-data-export` via raw fetch (preserves Content-Disposition + binary download), saves JSON locally.
- Delete: invokes `gdpr-account-deletion` with `{ confirm: 'DELETE' }`. Requires typing DELETE in confirmation AlertDialog. On success, signs the user out after 1.5s.
- Both edge functions already enforce auth, rate limits, and vendor/admin off-boarding blocks. Frontend only handles UX + signOut.

Surfaced in `CustomerAccount` below the grouped menu (before sign-out button).
