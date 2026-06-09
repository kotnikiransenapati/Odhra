---
name: Browse Insights
description: Personal 30-day browse trends dashboard panel — top categories, brands, sparkline, most-viewed
type: feature
---
- Hook `useBrowseInsights` aggregates `recently_viewed_products` joined to `products(categories, vendors, product_images)` within last 30 days (200-row cap).
- Computes: totalViews, uniqueProducts, avgPrice, top 5 categories, top 5 vendors, 7-day daily sparkline buckets, most-viewed product.
- UI: `BrowseInsightsPanel` shown on `CustomerAccount` — vendor chips deep-link to `/store/:slug`; sparkline rendered as plain CSS bars (no chart lib dep).
- Pure client aggregation — no extra tables; reuses existing RLS on `recently_viewed_products`.
