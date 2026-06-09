---
name: Custom Lists / Gift Registries
description: custom_lists + custom_list_items with public-by-slug sharing, owner CRUD, 200-item cap, list types (wishlist/registry/gift/project/custom). Routes /account/lists, /account/lists/:id, /lists/:slug.
type: feature
---
- Tables: `public.custom_lists` (RLS: owner ALL + `is_public=true` SELECT for anon/auth), `public.custom_list_items` (RLS via `is_list_owner(_list_id)` SECURITY DEFINER helper, public SELECT via `is_list_public(_list_id)`).
- Triggers: `bump_custom_list_updated_at` mints `share_slug` automatically when list goes public + validates name length (1–80) and `list_type` ∈ {wishlist,registry,gift,project,custom}. `validate_custom_list_item` caps 200 items/list, quantity 1–99, note ≤280 chars, and bumps parent `updated_at`.
- Helper functions revoked from public/anon (helpers granted only to authenticated/anon as needed for RLS evaluation; trigger functions revoked from everyone — only fired via triggers).
- Hooks: `useMyCustomLists` (includes `item_count` via PostgREST `count` aggregate), `useCustomList(id)` (split list+items), `useCreate/Update/DeleteCustomList`, `useAdd/RemoveItemFromList` (upsert on `(list_id,product_id)`), `usePublicCustomList(slug)` for `/lists/:slug`.
- Pages: `CustomLists` (index + create dialog with Type & Public toggle), `CustomListDetail` (owner edit), `PublicListView` (anon-friendly, `noIndex` SEO).
