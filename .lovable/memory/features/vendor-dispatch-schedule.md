---
name: Vendor Dispatch Schedule
description: Per-vendor weekday cutoff times + holiday calendar + computed next dispatch date
type: feature
---
**Tables**:
- `vendor_dispatch_schedules` (vendor_id UNIQUE, timezone, cutoff_hours JSONB per weekday 0-6 with hour 0-23 or null=closed, lead_days 0-30, notes)
- `vendor_dispatch_holidays` (vendor_id, holiday_date UNIQUE pair, reason)

**RPCs**:
- `vendor_compute_next_dispatch(_vendor_id, _placed_at)` — walks forward 60 days honoring cutoff + holidays + lead_days
- `vendor_dispatch_schedule_get(_vendor_id)` — returns schedule + holidays + next_dispatch

**RLS**: admins full; vendors manage own; public SELECT for storefront ETA display.

**UI**: `src/components/vendor/VendorDispatchSchedule.tsx` embeddable via `vendorId` prop. 7-day cutoff grid, timezone select, lead days, holidays add/remove. Default cutoffs Mon-Fri 17:00, Sat 14:00, Sun closed; timezone Asia/Kolkata.

**Integration**: Call `vendor_compute_next_dispatch` during checkout to show realistic delivery promise.
