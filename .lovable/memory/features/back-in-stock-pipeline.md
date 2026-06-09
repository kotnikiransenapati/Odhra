---
name: Back-in-stock alert pipeline
description: Product waitlist pipeline notifies customers when watched out-of-stock products become available again.
type: feature
---
- Product waitlist uses `product_waitlist` with user-only RLS plus service-role grants for backend processing.
- SECURITY DEFINER RPC `get_due_back_in_stock_waitlist(_limit)` is service-role only and returns unnotified waitlist rows for active products with stock > 0.
- Edge function `process-back-in-stock-alerts` inserts idempotent in-app notifications, best-effort email, then stamps `notified_at`.
- `BackInStockAlertsPanel` appears in CustomerAccount and only shows active unnotified alerts; wishlist out-of-stock CTA joins the waitlist.