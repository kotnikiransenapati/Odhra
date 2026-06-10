---
name: Saved for Later (Cart)
description: Cross-device "Saved for later" bucket persisted in carts.meta JSON. Surfaces under main cart with move-to-cart and remove actions, respects stock.
type: feature
---
- Schema: `public.carts.meta jsonb not null default '{}'` holds `{ saved: SavedItem[] }`.
- Context: `CartContext` exposes `savedItems`, `saveForLater(productId)`, `moveSavedToCart(productId)`, `removeSavedItem(productId)`.
- `saveForLater` moves an item from `items` to `meta.saved` and persists via `saveCart`.
- UI: `src/components/cart/SavedForLater.tsx` rendered inside `src/pages/Cart.tsx` below the line items. Disabled "Move" button when stock <= 0.
- Cart line items get a small "Save for later" link in `Cart.tsx` next to remove.
