---
name: Phase G hot-path indexes
description: Covering indexes added during Phase G hardening for dashboards, notifications, waitlist drain, and audit lookups.
type: feature
---
- `idx_orders_customer_created` `(customer_id, created_at desc)` — customer order history.
- `idx_orders_status_created` `(status, created_at desc)` — admin status filters.
- `idx_sub_orders_vendor_status` `(vendor_id, status)` — vendor dashboard counts.
- `idx_analytics_events_type_created` `(event_type, created_at desc)` — funnel/event reports.
- `idx_notifications_user_created` `(user_id, created_at desc)` — bell + page list.
- `idx_product_waitlist_pending` `(product_id) WHERE notified_at IS NULL` — back-in-stock RPC.
- `idx_recently_viewed_user_viewed` `(user_id, viewed_at desc)` — Browse Insights & Trending.
- `idx_audit_logs_entity` `(entity_type, entity_id, created_at desc)` — audit drill-down.
A DO block also grants `ALL ON public.<table> TO service_role` for every public table so cron/edge jobs never trip on missing privileges.
