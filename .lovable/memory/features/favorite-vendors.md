---
name: Favorite Vendors / Follow Sellers
description: favorite_vendors table with per-row notify_new_products & notify_sales toggles; FollowVendorButton for storefronts and FavoriteVendorsPanel for the account.
type: feature
---
- `public.favorite_vendors` (user_id, vendor_id UNIQUE, notify_new_products, notify_sales). RLS: user-only CRUD, no anon. Indexed by (user_id, created_at DESC) and by vendor_id (for vendor-side notification fan-out).
- Hook `useFavoriteVendors` joins `vendors_public!favorite_vendors_vendor_id_fkey` for safe public-only seller fields (logo, slug, is_verified). The FK is on `vendors` but PostgREST will follow the relationship name against the same column.
- `useIsVendorFavorited(vendorId)` for storefront Follow button (handles guest by linking to auth).
- `useToggleFavoriteVendor` is delete-or-insert (single source of truth, no race on the unique index for normal UI usage).
- Future: edge function notifications should select with `WHERE vendor_id = $1 AND (notify_new_products = true OR notify_sales = true)` and fan out via push/email respecting per-row prefs.
- `FavoriteVendorsPanel` surfaced in CustomerAccount; hides when empty.
- `FollowVendorButton` ready to drop onto `/store/:slug` (VendorStorefront).
