---
name: Order Holds
description: Admin-driven order hold system with categorized reasons, severity tiers, and release workflow
type: feature
---
**Table**: `order_holds` (reason_code, severity low/medium/high/critical, status active/released/expired, placed_by, released_by, expires_at).

**Reason codes**: fraud_review, payment_issue, address_verification, stock_issue, customer_request, manual_review, compliance_check, other.

**RPCs**:
- `admin_order_holds_stats` — active/critical/released_24h/total_active_value
- `admin_order_holds_list(_status, _limit, _offset)` — severity-sorted
- `admin_order_hold_place(_order_id, _reason_code, _severity, _notes, _expires_at)`
- `admin_order_hold_release(_hold_id, _release_notes)`

**UI**: `OrderHoldsManager.tsx` at Admin → Commerce → Order Holds. KPI tiles + tabs (active/released/expired). Gated by `view_orders`.
