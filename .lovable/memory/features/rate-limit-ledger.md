---
name: Rate Limit Ledger
description: Centralized sliding-window rate limiter via claim_rate_limit RPC and _shared/rateLimit.ts helper for edge functions
type: feature
---
- `public.claim_rate_limit(identifier, identifier_type, endpoint, max, window_seconds)` SECURITY DEFINER, service_role only
- Atomic UPSERT into `public.rate_limits` keyed on `(identifier, endpoint, window_start)` unique index
- Returns `(allowed, remaining, reset_at)`; opportunistic GC of entries >1 day old (1% probability)
- Edge functions use `_shared/rateLimit.ts` → `checkRateLimit()` + `rateLimitHeaders()` + `extractClientIp()`
- Helper fails open on RPC error to avoid hard outages, logs to console
