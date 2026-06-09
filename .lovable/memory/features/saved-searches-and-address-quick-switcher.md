---
name: Saved Searches & Default Address Quick Switcher
description: saved_searches table + SavedSearchesPanel/SaveCurrentSearchButton; DefaultAddressQuickSwitcher updates profiles.address_book
type: feature
---
Phase E Batch 2 (customer panel).

**Migration**: `public.saved_searches(user_id, name, query, filters jsonb, sort_by, alert_enabled, last_alert_at, last_match_count)`. RLS: `user_id = auth.uid()` only. updated_at trigger added.

**SavedSearchesPanel + SaveCurrentSearchButton** (`src/components/customer/SavedSearchesPanel.tsx`):
- `SaveCurrentSearchButton` is reusable; dropped into `src/pages/Shop.tsx` toolbar with `query`, `sort`, and a `filters` object derived from active URL state (category, featured, instock, rating, price range).
- Panel lists saved searches, allows toggling alerts via `Switch`, deleting, and re-running via generated `/shop?...` URL.
- Alert delivery pipeline (background job that diffs `last_match_count` and inserts notifications) is not yet wired — toggle is stored only.

**DefaultAddressQuickSwitcher** (`src/components/customer/DefaultAddressQuickSwitcher.tsx`):
- Reads `profiles.address_book` (JSONB), shows up to 4. Tapping a non-default address rewrites the whole array setting `is_default` on the chosen entry.
- Persists via `JSON.parse(JSON.stringify(next))` to convert to plain JSON before update (avoids JSONB type mismatch).

Both surfaced in `CustomerAccount` two-column grid below the Pulse.
