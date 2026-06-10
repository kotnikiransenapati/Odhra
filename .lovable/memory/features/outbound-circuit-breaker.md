---
name: Outbound Circuit Breaker
description: outbound_circuit_breakers table, admin panel, and Edge Function helper for fail-fast upstream calls
type: feature
---
Phase G Batch 18 adds outbound API circuit breakers.

- `outbound_circuit_breakers` stores per-service state: `closed`, `open`, `half_open`, failure thresholds, cooldown windows, and last error.
- Edge functions should wrap third-party calls with `_shared/circuitBreaker.ts` and the `withCircuitBreaker` helper.
- Service-role RPCs record success/failure and automatically open circuits after threshold failures.
- Admin RPC `admin_set_circuit_breaker` lets active admins force a state with audit logging.
- Admin UI `CircuitBreakerPanel` lives under Admin → System → Circuit Breakers.