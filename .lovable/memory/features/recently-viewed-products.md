---
name: Recently Viewed Products (server-synced)
description: Cross-device recently viewed history via recently_viewed_products table + track_product_view RPC, surfaced in CustomerAccount.
type: feature
---
- Table `public.recently_viewed_products` (user_id, product_id UNIQUE per user, viewed_at, view_count, source). RLS: user-only CRUD.
- SECURITY DEFINER RPC `public.track_product_view(_product_id, _source)` upserts row, increments `view_count`, refreshes `viewed_at`, trims user history to most-recent 50. EXECUTE granted only to `authenticated` (anon revoked).
- Hook `useRecentlyViewedServer(limit)` reads with product join + images. Exports `trackProductView(productId, source?)` — fire-and-forget, no-op for guests.
- `RecentlyViewedPanel` shown in CustomerAccount; hides when empty. Per-item remove + bulk clear.
- ProductDetail still updates local `useRecentlyViewed` (sessionStorage) AND calls `trackProductView` for signed-in cross-device sync.
