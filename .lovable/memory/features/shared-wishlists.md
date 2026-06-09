---
name: Shared Wishlists
description: Public shareable wishlist links with secure server-side resolution via get_public_shared_wishlist RPC
type: feature
---
- Table `shared_wishlists` stores per-owner share entries (`share_code`, `title`, `description`, `is_public`, `view_count`).
- Public reads go through SECURITY DEFINER RPC `get_public_shared_wishlist(_share_code)` (returns nested items + owner profile) — required because `wishlists` is owner-only RLS.
- `increment_shared_wishlist_view(_share_code)` bumps `view_count` only when entry is public.
- Hook: `useSharedWishlists` (list/create/update/delete) + `usePublicSharedWishlist` for the public view.
- UI: `SharedWishlistsPanel` on `/wishlist`. Public page `/w/:code` (`PublicSharedWishlist`) with Helmet OG tags; `noindex` when not found.
- Share codes are 10-char `crypto.getRandomValues` base36 strings.
