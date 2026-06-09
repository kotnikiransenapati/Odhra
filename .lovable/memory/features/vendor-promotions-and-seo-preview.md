---
name: Vendor Promotions & Storefront SEO Preview
description: VendorPromotionBuilder lets vendors create self-scoped coupons; VendorStorefrontSeoPreview shows Google/social card previews with optimization score
type: feature
---
Phase D Batch 2 (vendor panel).

**RLS migration**: added `public.is_own_vendor_promotion(uuid[])` SECURITY DEFINER helper and policy "Vendors manage own promotions" on `public.promotions`. Vendors can manage rows where `applicable_vendors` contains exactly one vendor and that vendor's `user_id = auth.uid()`. Inserts also require `created_by = auth.uid()`.

**VendorPromotionBuilder** (`src/components/vendor/VendorPromotionBuilder.tsx`):
- Lists vendor-scoped coupons (`contains('applicable_vendors', [vendorId])`).
- Create/edit dialog: percentage or fixed discount, min order, max cap, usage limit, start/end window, active toggle, randomly generated VND* code.
- Validation: name required, value > 0, percentage ≤ 90.
- Toggle, delete, copy-code, and live KPI counts (total/active/redeemed).

**VendorStorefrontSeoPreview** (`src/components/vendor/VendorStorefrontSeoPreview.tsx`):
- Pulls vendor row + active product count, renders Google SERP-style preview and 1.91:1 social share card.
- 8-item weighted checklist (name 10 / slug 10 / bio ≥80 chars 15 / bio ≤160 chars 5 / logo 10 / banner 10 / verified 15 / ≥5 active products 25) → 0–100 score with severity icons.
- Uses `getSiteBaseUrl()` from `@/lib/siteUrl` for canonical URL preview.

Both surfaced as `promos` and `seo` tabs in `VendorDashboard`.
