---
name: Vendor Payout Holds
description: Admin-managed blocks on vendor payouts with severity, reason, audit, and release flow
type: feature
---
Table `vendor_payout_holds`: vendor_id (FK vendors), reason (3–1000 chars), severity (low/medium/high/critical), placed_by, released_by, released_at, release_note, is_active.

RLS:
- SELECT: `view_payouts`
- ALL: `manage_payouts`

RPCs (SECURITY DEFINER):
- `admin_payout_holds_stats()` → active_total, critical, high, vendors_held, released_7d
- `admin_payout_holds_list(_status, _limit)` → joined with vendor business_name; status: active/released/all
- `admin_payout_hold_place(_vendor_id,_reason,_severity)`
- `admin_payout_hold_release(_id,_note)`
- `vendor_is_payout_blocked(_vendor_id) → boolean` — call before approving payouts to short-circuit

UI: `VendorPayoutHolds.tsx` (Admin → Commerce). KPI tiles, severity badges, place/release dialogs.

Integration: payout approval logic should reject when `vendor_is_payout_blocked()` returns true.
