---
name: Trending Now Carousel
description: Homepage trending products carousel powered by get_trending_products RPC ranking last 7 days by unique viewers
type: feature
---
- SECURITY DEFINER RPC `public.get_trending_products(_days int, _limit int)` aggregates `recently_viewed_products` (last N days) joined to active products + primary image + vendor; orders by `COUNT(DISTINCT user_id) DESC`. EXECUTE granted to anon, authenticated.
- Hook `useTrendingProducts(days=7, limit=12)` with 10-minute staleTime.
- UI `TrendingNowCarousel` — horizontal snap-scroll, rank badge (#1, #2…), discount badge, unique-viewer chip. Skeleton fallback.
- Mounted on the homepage (`Index.tsx`).
