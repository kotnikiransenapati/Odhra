---
name: PII Redaction Pipeline
description: Shared redactString/redactObject scrubbing emails, Indian phones, cards, JWTs, Razorpay IDs, secrets, OTPs, Aadhaar, IPs before logging
type: feature
---
Dual implementation kept in sync (no shared deps allowed):
- `src/lib/piiRedaction.ts` — browser side (used by `globalErrorReporter.ts` for `error_logs` writes)
- `supabase/functions/_shared/piiRedaction.ts` — edge functions

API:
- `redactString(s)` masks values inline
- `redactObject(obj, depth?)` recursively walks; drops any `SENSITIVE_KEYS` value to `[REDACTED]` (password/token/secret/cookie/cvv/aadhaar/pan/ifsc...)
- `redact(value)` dispatches automatically

Masking strategy: `ab***@domain.com`, `***1234` (phones), `****1234` (cards), `[JWT_REDACTED]`, `[RZP_ID]`, `[SECRET]`, `[AADHAAR]`, `[IP]`, OTP key/value erased.

Apply before persisting anything user-derived into `error_logs`, `audit_logs.metadata`, or external sinks.
