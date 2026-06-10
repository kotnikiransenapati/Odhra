---
name: Nightly maintenance orchestrator
description: Edge function `nightly-maintenance` orchestrates inventory forecasts, vendor scorecards, dynamic segment refresh, and webhook GC.
type: feature
---
- Function: `supabase/functions/nightly-maintenance/index.ts` (`verify_jwt = false`).
- Steps, each wrapped in `runJob()` so a single failure does not abort the rest:
  1. `compute_inventory_forecasts(30)` — rolling 30-day velocity refresh.
  2. `compute_vendor_performance(start, end)` — last 30 days; RPC fans out to every approved vendor internally.
  3. Touch every `customer_segments WHERE is_dynamic = true` row's `updated_at` so downstream caches recompute.
  4. Delete `webhook_events.created_at < now() - 30d` — keeps ledger from unbounded growth.
- Response: HTTP 200 if every job ok, 207 if any partial; body always contains the per-job duration/error array.
- Schedule (run via pg_cron in the user-data SQL channel, not migrations):
  `cron.schedule('nightly-maintenance', '15 2 * * *', $$select net.http_post(url:='.../functions/v1/nightly-maintenance', headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb, body:='{}'::jsonb)$$);`
