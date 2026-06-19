---
name: Vendor Announcements
description: Admin broadcast center for vendors with targeting, priority, scheduling, and read tracking
type: feature
---
**Tables**:
- `vendor_announcements` (title, body, priority low/normal/high/critical, category general/policy/payout/product/outage/promotion, target_mode all/kyc_verified/specific, target_vendor_ids UUID[], cta_label/url, status draft/published/archived, publish_at, expires_at)
- `vendor_announcement_reads` (announcement_id, vendor_id) — UNIQUE pair

**RPCs**:
- `admin_vendor_announcements_list(_status)` — with read_count aggregation
- `vendor_my_announcements()` — vendor-facing, filtered by target_mode + active window, includes is_read
- `vendor_mark_announcement_read(_announcement_id)`

**RLS**: admins full; vendors SELECT only published+active+targeted; vendors manage own reads.

**UI**: `VendorAnnouncementCenter.tsx` at Admin → Users & Vendors. Tabs (all/draft/published/archived). Gated by `manage_vendors`.
