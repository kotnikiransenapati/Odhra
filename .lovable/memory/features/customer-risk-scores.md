---
name: Customer Risk Scores
description: Per-user fraud risk score (0-100) auto-derived from orders, payments, returns, account age, login failures, with manual override
type: feature
---
Tables:
- `customer_risk_scores` — one row per user (UNIQUE user_id): score 0–100, tier (low/medium/high/critical via `derive_risk_tier`), factors JSONB, manual_override flag, override_reason, reviewed_by/at, last_computed_at.
- `customer_risk_events` — append-only audit of every score change (old/new score+tier, reason, changed_by).

RPCs (all SECURITY DEFINER; gated):
- `compute_customer_risk_score(_user_id)` → recomputes from orders/return_requests/login_attempts; respects manual_override (keeps overridden score, updates factors only); logs to events when score changes. Requires `manage_fraud_signals`.
- `admin_override_risk_score(_user_id,_score,_reason)` → forces a manual score + sets manual_override=true, logs event. Requires `manage_fraud_signals`.
- `admin_risk_scores_stats()` → totals by tier + avg_score + override count. Requires `view_fraud_signals`.
- `admin_risk_scores_list(_tier,_limit)` → joined with auth.users / profiles for display.

Scoring weights (tunable):
- failed_payments × 8
- (returns / orders) × 25 (returns ratio bucket)
- login_failures_30d (capped at 10) × 3
- account_age < 7 days → +15, < 30 days → +5

UI: `CustomerRiskScores.tsx` (Admin → Security). KPI tiles (Tracked / Critical / High / Medium / Avg / Overrides), tier filter, Recompute + Override actions. Override dialog requires non-empty reason.
