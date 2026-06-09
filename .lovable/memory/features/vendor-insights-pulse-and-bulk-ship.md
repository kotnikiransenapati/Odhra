---
name: Vendor Insights Pulse & Bulk Ship
description: VendorInsightsPulse computes proactive vendor alerts; VendorBulkOrderActions enables bulk status/shipping updates on sub_orders
type: feature
---
Phase D Batch 1 (vendor panel).

**VendorInsightsPulse** (`src/components/vendor/VendorInsightsPulse.tsx`):
- Computes severity-ranked actionable insights: KYC pending, overdue ship (>48h), pending fulfillment, low stock (<10), open disputes, payout in progress, WoW sales delta (±15%).
- Sorts by severity (critical→warning→info→success). Shows "All clear" success card when nothing actionable.
- Resolves vendor via `impersonatedVendor.id` when impersonating, else `vendors.user_id = auth user`.

**VendorBulkOrderActions** (`src/components/vendor/VendorBulkOrderActions.tsx`):
- List of sub_orders with status filter (pending/confirmed/processing/shipped/all).
- Multi-select with bulk Confirm / Processing / Mark Shipped (carrier + single tracking number applied to all).
- Uses `supabase.from('sub_orders').update(... as any).in('id', ids)` to bypass enum narrowing.

Both surfaced as new tabs (`pulse`, `bulk`) in `VendorDashboard`.
