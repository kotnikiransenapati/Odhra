---
name: Idempotent Mutation Envelope
description: Edge function helper + DB ledger that guarantees retried POSTs (with same Idempotency-Key) execute at most once, replaying cached responses on duplicates.
type: feature
---
**Table**: `public.mutation_idempotency (scope, idempotency_key UNIQUE, request_hash, response, status, http_status, expires_at)`. 24h TTL, RLS lets admins read and service role write.

**RPCs (SECURITY DEFINER, service_role only)**:
- `claim_mutation_key(scope, key, user_id, request_hash)` → atomic INSERT-or-fetch. Raises `idempotency_key_conflict` (P0001) if same key reused with different body hash.
- `complete_mutation_key(scope, key, response, http_status, success)` → caches response + marks status.

**Edge helper** `supabase/functions/_shared/idempotency.ts`:
- `withIdempotency({ scope, req, body, userId, supabase, handler })` reads `Idempotency-Key` header, hashes canonical body (sorted-keys JSON → SHA-256), claims, runs handler, persists. Sets `Idempotent-Replay: true` header on cached replays.
- No key → falls through to plain execution (opt-in).
- Pending duplicate → 409 with envelope error.
- `assertKillSwitchInactive(supabase, key)` calls `is_kill_switch_active` and throws `EnvelopeError(FORBIDDEN, status 503)` if the feature is killed.

Pairs with `errorEnvelope.ts` so all responses are uniform.
