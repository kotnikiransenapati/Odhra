---
name: Phase C — Split-pane orders, KYC aging queue, bulk actions
description: OrderSplitPane (list+detail with bulk status toolbar) and KycReviewQueue (0-24h/1-3d/3-7d/7d+ aging buckets) admin tabs; both reuse existing tables with admin RLS
type: feature
---
- Tab ids: `orders-split` (perm `view_orders`), `kyc-queue` (perm `manage_vendors`).
- OrderSplitPane writes `orders.status` directly via supabase update; uses `as any` cast because RPC enums aren't widened in generated types.
- KYC approve/reject sets `vendor_kyc_documents.status` + `verified_at`; reject requires non-empty `rejection_reason`.
- Bucket logic uses `(now - uploaded_at) / 3600000` hours: <24=green, <72=amber, <168=orange, else=destructive.
