---
name: Gift Orders
description: orders extended with is_gift/gift_recipient_name/gift_message/gift_wrap_fee; GiftWrapToggle for checkout + GiftOrdersPanel listing past gift orders; trigger validates fields
type: feature
---
Phase E Batch 6.

**Migration**: extended `public.orders` with `is_gift boolean default false`, `gift_recipient_name text`, `gift_message text`, `gift_wrap_fee numeric(10,2) default 0`. Validation trigger `trg_validate_order_gift_fields` (BEFORE INSERT/UPDATE):
- Zeroes/NULLs gift fields when `is_gift = false` (defensive sanitization).
- Caps `gift_message` at 280 chars.
- Constrains `gift_wrap_fee` to 0–500.

Partial index `idx_orders_is_gift (customer_id, created_at DESC) WHERE is_gift = true` keeps the GiftOrdersPanel query sub-ms.

**GiftWrapToggle** (`src/components/checkout/GiftWrapToggle.tsx`): controlled component for Checkout. Exports `GiftOptions` interface + `DEFAULT_GIFT_OPTIONS`. Toggling on auto-applies the ₹49 wrap fee; toggling off resets fields. Caller must include resulting fields in the orders insert payload AND add `gift_wrap_fee` to the order total client-side (server trigger only validates, does not auto-add).

**GiftOrdersPanel** (`src/components/customer/GiftOrdersPanel.tsx`): lists last 5 gift orders for the user with recipient, italic message preview, status badge. Hides entirely if zero gift orders.

Surfaced in `CustomerAccount` next to the privacy panel grid.
