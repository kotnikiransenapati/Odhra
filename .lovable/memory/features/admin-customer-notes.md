---
name: Admin Customer Notes
description: Internal admin notes attached to customers with category, pin, archive, and audit
type: feature
---
Table `admin_customer_notes`: customer_id, author_id, category (general/billing/fraud/support/vip), body (1–4000 chars), is_pinned, is_archived.

RLS:
- SELECT: anyone with `view_customers`
- INSERT: requires `manage_customers` AND author_id = auth.uid()
- UPDATE/DELETE: author OR `manage_admins`

RPCs:
- `admin_customer_notes_list(_customer_id,_include_archived)` → joined with author email, sorted pinned first then newest
- `admin_customer_notes_stats(_customer_id)` → totals + pinned/fraud/vip counts + last_note_at

UI: `AdminCustomerNotes.tsx` — embeddable in Customer 360 view. Composer with category + pin toggle; per-note pin/archive/delete; archived hidden by default.
