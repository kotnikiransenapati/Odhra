---
name: Order Tags
description: Reusable color-coded order tags for triage/workflow with assignment tracking
type: feature
---
**Tables**:
- `order_tags` (label UNIQUE, color, description, is_system, created_by)
- `order_tag_assignments` (order_id, tag_id) — UNIQUE pair

**RPCs**:
- `admin_order_tags_list` — with usage_count
- `admin_order_tags_for(_order_id)`
- `admin_order_tag_assign(_order_id, _tag_id)` — idempotent UPSERT
- `admin_order_tag_remove(_order_id, _tag_id)`

**RLS**: admins full; vendors SELECT tags + assignments on their own sub-orders.

**UI**: `OrderTagsManager.tsx` standalone registry at Admin → Commerce. Embeddable picker mode via `orderId` + `embedded` props for order detail pages (assign/remove inline with `X` button).
