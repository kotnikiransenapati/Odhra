---
name: Edge Function Error Envelope
description: Shared `_shared/errorEnvelope.ts` providing ok/fail/withEnvelope helpers — uniform JSON shape, request IDs, EnvelopeError class
type: feature
---
Shape:
- success: `{ ok: true, data, request_id }`
- error: `{ ok: false, error: { code, message, details }, request_id }`

Codes: `bad_request`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `validation_error`, `upstream_error`, `internal_error` → mapped HTTP status.

Usage:
- `serve(withEnvelope(async (req, ctx) => { ... }))` — auto CORS preflight, request-id (`X-Request-Id`), error catch, duration logging
- `ok(data, { requestId })` / `fail(ErrorCode.NOT_FOUND, 'msg')`
- `throw new EnvelopeError(ErrorCode.FORBIDDEN, 'msg', { details })` inside handler → auto-serialized

Apply to new edge functions; safe to retrofit existing ones incrementally.
