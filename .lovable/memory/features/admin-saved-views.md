---
name: Admin Saved Views
description: Per-admin saved filter/sort/column presets per scope, with sharing, pinning, and usage tracking
type: feature
---
**Table**: `admin_saved_views` (admin_id, scope, name, filters JSONB, sort_config JSONB, columns JSONB, is_shared, pinned, use_count, last_used_at). Unique on (admin_id, scope, name).

**Scopes**: orders, customers, vendors, products, refunds, disputes, support, analytics.

**RPCs**:
- `admin_saved_views_list(_scope)` — own + shared, pinned/use_count ordered
- `admin_saved_view_save(...)` — upsert by (admin, scope, name)
- `admin_saved_view_delete(_id)`
- `admin_saved_view_apply(_id)` — increments use_count, sets last_used_at
- `admin_saved_view_toggle_pin(_id)`

**RLS**: admins see their own + shared; only owner can modify.

**UI**: `AdminSavedViews.tsx` standalone page (Admin → System → Saved Views) and embeddable with `scope` + `onApply` props for in-context use on any admin table.
