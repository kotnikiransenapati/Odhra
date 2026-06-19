---
name: Gift Cards System
description: End-to-end gift card lifecycle — admin issuance, customer redemption, atomic balance tracking with row locks, expiry handling
type: feature
---
**Tables**
- `gift_cards`: code (unique), initial_amount, balance, status (active/redeemed/expired/cancelled), issued_to_user_id, issued_to_email, recipient_name, sender_name, message, expires_at, currency (default INR)
- `gift_card_redemptions`: ledger linking gift_card_id → user_id → order_id with amount and balance_after snapshot

**Code format**: `GC-XXXX-XXXX-XXXX` using the legibility-safe alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes 0/O/1/I). Generator retries up to 5x on collision.

**RPCs**
- `admin_giftcard_issue(amount, recipient_email, recipient_user_id, recipient_name, sender_name, message, expires_days=365)` — admin only
- `admin_giftcards_list(status, search, limit, offset)` — paginated with `total_redemptions` per card
- `admin_giftcard_cancel(id)` — only mutates active cards
- `giftcard_check(code)` — auth required, non-mutating validation (also auto-expires past-due cards)
- `giftcard_redeem(code, amount, order_id?)` — atomic via `FOR UPDATE` lock; applies `LEAST(amount, balance)`, auto-marks `redeemed` when balance hits zero, claims `issued_to_user_id` on first redemption
- `my_gift_cards()` — customer view of their assigned cards

**Security**
- All RPCs `SECURITY DEFINER` with `set search_path = public` and `auth.uid()` checks
- RLS: admins manage all; users SELECT only their own (`issued_to_user_id = auth.uid()`)
- Redemption ledger: admins see all; users see only their own
- Double-spend prevention via row-level `FOR UPDATE` lock inside `giftcard_redeem`

**UI**: `src/components/admin/GiftCardManager.tsx` under Admin → Marketing → Gift Cards. Issue dialog, status tabs (all/active/redeemed/expired/cancelled), search by code/email/name, copy-code action, cancel button on active cards. KPIs: active count, total issued value, outstanding balance.
