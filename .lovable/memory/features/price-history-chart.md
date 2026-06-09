---
name: Price History Chart
description: 90-day price trend chart on PDP with near-low badge; hook usePriceHistory aggregates price_history rows
type: feature
---
- Hook `usePriceHistory(productId, days=90)` reads `price_history` (publicly readable RLS) and returns min/max/current + `isAtOrNearLow` (within 2% of low).
- `PriceHistoryChart` renders inline SVG sparkline using `hsl(var(--accent))` with gradient fill — zero chart library deps.
- Mounted on `ProductDetail` above the tabs section. Renders nothing when fewer than 2 data points exist.
- Reuses semantic tokens; no hardcoded colors.
