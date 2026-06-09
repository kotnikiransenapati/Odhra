---
name: Product Comparison
description: Client-side compare tray (max 4) backed by localStorage with cross-tab sync, floating CompareBar, /compare route table
type: feature
---
`CompareContext` persists `{id, slug, title, image, price}` to `localStorage` key `compare:v1`, max 4 items, cross-tab `storage` listener keeps tabs in sync. `CompareButton` toggles add/remove and disables when the tray is full. `CompareBar` floats above the bottom nav (hidden on `/compare`, `/checkout`, `/auth`) showing thumbnails with remove + Clear + Compare CTA. `/compare` page lazy-loads full product rows with `useQuery`, renders a sticky-first-column comparison table (price, discount, rating, availability, description, perks) with per-card Add-to-Cart and per-card Remove. Provider mounted high in `App.tsx`, route lazy-loaded.
