---
name: Order Note Templates
description: Reusable canned note templates with {{variable}} interpolation, categorized and usage-tracked
type: feature
---
**Table**: `order_note_templates` (title, body, category internal/customer/shipping/refund/fraud, variables JSONB[], is_shared, use_count, last_used_at, created_by).

**RPCs**:
- `admin_order_note_template_use(_id)` — increments counters
- `admin_order_note_templates_stats` — totals + by_category

**RLS**: admins SELECT shared + own; only owner can update/delete.

**UI**: `OrderNoteTemplates.tsx` standalone at Admin → Commerce → Order Note Templates. Embeddable mode with `embedded`, `onPick(rendered, template)`, and `contextVars` props for in-context use on order detail pages — renders `{{customer_name}}` etc. via split/join interpolation (TS-lib safe, no `replaceAll`).
