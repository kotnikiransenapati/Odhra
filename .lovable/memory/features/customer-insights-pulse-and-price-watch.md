---
name: Customer Insights Pulse & Price Watch
description: CustomerInsightsPulse surfaces personalized customer alerts; price_watches table + PriceWatchPanel + PriceWatchButton enable price-drop notifications via a Postgres trigger
type: feature
---
Phase E Batch 1 (customer panel).

**Migration**: created `public.price_watches(user_id, product_id, target_price, baseline_price, notified_at, notified_price)` with unique (user_id, product_id), RLS scoping to `auth.uid()`, and trigger `trg_notify_price_drop_watchers` on `products.price` AFTER UPDATE that:
- Skips if price didn't decrease.
- For watches where new price ≤ target AND (not yet notified OR new price < last notified price), inserts a `notifications` row (type `price_drop`, data `{product_id, price, target_price}`) and updates `notified_at` + `notified_price`. SECURITY DEFINER to bypass watcher RLS.

**CustomerInsightsPulse** (`src/components/customer/CustomerInsightsPulse.tsx`):
- Severity-ranked personalized cards: in-flight order (track), expiring points (≤14d window, critical if ≤7d), tier-progress (≤500pts to next), stale cart (>3 days), pending returns, unclaimed share rewards. Falls back to "all caught up" success card.
- Casts `supabase as any` for Promise.all to dodge TS2589 deep-instantiation on heterogeneous query unions.

**PriceWatchPanel + PriceWatchButton** (`src/components/customer/PriceWatchPanel.tsx`):
- Panel lists watches with current vs target price, % delta badge, "Hit!" badge when target reached. Realtime via `useRealtimeChannel` reloading on user-scoped row changes.
- Button is reusable on product pages: opens dialog to set target (must be < current), upserts/deletes row.

Both surfaced in `CustomerAccount` before the grouped menu.
