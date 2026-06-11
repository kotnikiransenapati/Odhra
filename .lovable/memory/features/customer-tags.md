---
name: Customer Tags
description: Admin-managed tag registry and per-customer tag assignments for ad-hoc segmentation
type: feature
---
Tables:
- `customer_tags`: label (2–40 unique), color (default/secondary/destructive/outline), description, created_by
- `customer_tag_assignments`: tag_id, customer_id, assigned_by, UNIQUE(tag_id,customer_id)

RLS:
- SELECT: `view_customers`
- ALL: `manage_customers`; assignments require assigned_by = auth.uid()

RPCs (SECURITY DEFINER):
- `admin_customer_tags_list()` → tags with usage_count
- `admin_customer_tags_for(_customer_id)` → applied tags
- `admin_customer_tag_assign(_customer_id,_tag_id)` (UPSERT)
- `admin_customer_tag_remove(_assignment_id)`

UI:
- `CustomerTagsManager.tsx` (Admin → Users) — registry CRUD with usage counts
- `CustomerTagPicker.tsx` (named export from same file) — embeddable per-customer selector for Customer 360
