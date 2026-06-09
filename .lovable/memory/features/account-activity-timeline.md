---
name: Account Activity Timeline
description: Read-only unified feed merging orders, loyalty_transactions, and user_sessions into a single chronological list for CustomerAccount.
type: feature
---
- Hook `useAccountActivity(limit)` runs 3 parallel selects (orders, loyalty_transactions, user_sessions), merges + sorts desc by occurred_at, returns last `limit` items.
- Item shape: `{ kind: 'order'|'loyalty'|'session'|'review', occurred_at, title, subtitle?, amount?, href? }`.
- No new DB tables. Purely client aggregation, RLS on each underlying table already restricts to `auth.uid()`.
- `ActivityTimelinePanel` renders a left-rail timeline with icon-per-kind and relative timestamps via `date-fns`. Surfaced in CustomerAccount.
