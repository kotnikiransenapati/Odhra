---
name: Order Watchlist
description: Per-admin pinned orders requiring follow-up with severity, due dates, and resolution tracking
type: feature
---
Table `admin_order_watchlist` (UNIQUE admin_user_id+order_id): reason (1–500 chars), severity (low/medium/high), due_at, resolved_at, resolution_note.

RLS: admins manage only their own rows (require `view_orders`); super admins (`manage_admins`) can view all.

RPCs:
- `admin_watchlist_list(_status, _limit)` — status: open / overdue / resolved / all. Joined with orders for order_number, status, total
- `admin_watchlist_stats()` — mine_open, mine_overdue, mine_high, mine_resolved_7d
- `admin_watchlist_add(_order_id,_reason,_severity,_due_at)` — UPSERT on conflict re-opens
- `admin_watchlist_resolve(_id,_note)`
- `admin_watchlist_remove(_id)`

UI: `OrderWatchlist.tsx` (Admin → Orders). KPI tiles, status filter, link back to order detail, due-date overdue highlight in destructive color.
