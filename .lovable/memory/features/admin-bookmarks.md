---
name: Admin Bookmarks
description: Personal admin page shortcuts with label, path, optional icon, and reorder
type: feature
---
Table `admin_bookmarks` (UNIQUE admin_user_id+path): label, path, icon, sort_order. RLS: each admin manages only their own rows.

RPCs:
- `list_my_admin_bookmarks()` → ordered by sort_order, created_at
- `upsert_my_admin_bookmark(_label,_path,_icon)` → idempotent on path
- `delete_my_admin_bookmark(_id)`
- `reorder_my_admin_bookmarks(_ids[])` → assigns sort_order from array position

UI: `AdminBookmarks.tsx` (Admin → System → My Bookmarks). Open to any authenticated admin. Add dialog, move up/down, delete. Paths are admin-relative (`/admin?tab=...`).
