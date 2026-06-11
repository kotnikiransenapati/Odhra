---
name: Vendor Onboarding Checklist
description: Per-vendor onboarding task tracker with default seed, status toggles, and progress
type: feature
---
Table `vendor_onboarding_tasks` (UNIQUE vendor_id+task_key): title, description, is_required, status (pending/in_progress/completed/skipped), due_at, completed_at/by, sort_order.

RLS:
- SELECT: admins with `view_vendors` OR the vendor's own user
- ALL: admins with `manage_vendors`
- Vendors can set status on their own tasks via SECURITY DEFINER RPC

RPCs:
- `vendor_onboarding_seed(_vendor_id)` → idempotent insert of 8 default tasks (profile, kyc, branding, payout, catalog, shipping, policies, test_order)
- `vendor_onboarding_list(_vendor_id)`
- `vendor_onboarding_stats(_vendor_id)` → total, required, completed, required_completed, in_progress, overdue, percent
- `vendor_onboarding_set_status(_task_id,_status)`

UI: `VendorOnboardingChecklist.tsx` — embeddable, `<VendorOnboardingChecklist vendorId=… />`. Progress bar, per-task status select, overdue counter.
