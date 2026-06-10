---
name: Edge Validation Registry
description: Shared `_shared/validation.ts` Zod helpers (validate/validateBody/validateQuery) + reusable schemas (orderCreate, razorpayVerify, contactSubmit, etc.) that throw EnvelopeError(VALIDATION)
type: feature
---
Atoms: `uuid`, `positiveInt`, `nonEmpty`, `email`, `isoDate`, `url`, `inrPaise`, `safeText(max)`, `indianPhone`, `pincode`.

Schemas (under `schemas.*`):
- uuidParam, paginate (limit≤200, offset≥0)
- orderCreate, razorpayVerify, emailSend, shipmentTrack
- webhookGeneric (passthrough), pincodeQuery, contactSubmit

Pattern (combine with errorEnvelope.withEnvelope):
```ts
serve(withEnvelope(async (req, ctx) => {
  const body = await validateBody(schemas.orderCreate, req, ctx.requestId);
  ...
}));
```
Validation failure returns `{ ok:false, error:{ code:'validation_error', details:{fieldErrors, formErrors} }, request_id }` with HTTP 400.
