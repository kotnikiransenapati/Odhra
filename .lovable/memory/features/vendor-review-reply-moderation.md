---
name: Vendor Review Reply Moderation
description: Vendors respond to product reviews; replies require admin/moderator approval before becoming public
type: feature
---
**Schema additions on `reviews`**
- `vendor_reply_status` (none/pending/approved/rejected/flagged, default 'none')
- `vendor_reply_moderated_at`, `vendor_reply_moderated_by`, `vendor_reply_moderation_notes`
- Partial index `reviews_vendor_reply_status_idx` filtered to pending/flagged for fast queue queries
- Existing `vendor_reply` and `vendor_replied_at` columns reused

**RPCs**
- `vendor_submit_review_reply(review_id, reply)` — vendor or admin only; reply 3-2000 chars; resets status to `pending` on every submission/edit (re-moderation required)
- `admin_review_reply_moderate(review_id, decision, notes?)` — admin/moderator only; decision in approved/rejected/flagged; **rejection clears `vendor_reply`** to hide it publicly while preserving audit trail in moderation_notes
- `admin_review_replies_list(status='pending', limit, offset)` — joins products + vendors, supports status='all'

**Security**
- Ownership check via `vendors.user_id = auth.uid()` for vendor submission
- All RPCs `SECURITY DEFINER` with `set search_path = public`
- Moderators (not just admins) can moderate via `has_role(auth.uid(), 'moderator')`

**UI**: `src/components/admin/VendorReviewRepliesModerator.tsx` under Admin → Marketing → Vendor Reply Moderation. Tabbed queue (pending/flagged/approved/rejected/all), inline approve/flag, rejection requires modal with required moderation notes. Gated under `moderate_reviews` permission.
