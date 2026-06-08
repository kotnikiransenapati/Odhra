# Phase 2 — Highly Advanced Customer Panel

Goal: transform `/account/*` into a polished, fast, accessible, conversion-driven customer hub matching the Bold & Editorial design language (deep navy + warm pink, glass surfaces, Framer Motion springs, haptics, 15-day session).

Delivered as sequential batches so each one is reviewable and shippable.

---

## Batch 1 — Account Hub redesign (`CustomerAccount.tsx`)
- Sticky personalized hero: avatar, name, tier badge, points balance, next-tier progress, member-since.
- Smart action row: Track latest order, Reorder, Refer & Earn — each pulled from live data.
- Reorganized menu into grouped sections: Orders & Returns / Rewards & Wallet / Preferences / Security.
- Skeleton states, motion stagger, haptics on tap, a11y landmarks (`<main>`, headings, aria-labels).

## Batch 2 — Profile & Settings polish (`Settings.tsx`)
- Tabbed Settings: Profile, Security, Notifications, Privacy, Sessions, Danger Zone.
- Avatar upload (Supabase Storage `avatars` bucket, public read, owner-only write RLS) with crop preview.
- Inline edit profile (zod validation), phone with country code, DOB, gender (optional).
- Password change with current-password check + strength meter (reuse `PasswordStrengthIndicator`).
- 2FA management surfaced from `TwoFactorSettings`.
- Active sessions list (`useSessions`) with revoke buttons.
- GDPR: data export + account deletion (existing edge functions).

## Batch 3 — Orders & Tracking UX
- Orders list: status filter chips, search, infinite scroll, empty state with CTA.
- Order detail: vendor-grouped sub-orders, item thumbnails, sticky summary, invoice download, reorder, cancel, return.
- Tracking page: vertical timeline (India Post / Delhivery events), ETA card, copy tracking, share, map placeholder.
- Cancellation & Return wizards reviewed for parity, haptics, motion.

## Batch 4 — Rewards, Loyalty, Wallet, Referrals
- Rewards Center: tier card, points history (paged), redemption catalog with confirm dialog, daily check-in, challenges, leaderboard.
- Wallet: balance card, transaction list with filters, coupons grid, expiring-soon highlights.
- Referrals: shareable link/QR, copy + native share, stats (invited / signed-up / earned), payout progress.

## Batch 5 — Notifications, Preferences, Privacy
- Notifications inbox with read/unread, bulk actions, filters by type.
- Channel preferences matrix (Email / Push / WhatsApp / SMS) per topic.
- Cookie consent management, marketing opt-outs, data download.

## Batch 6 — Performance, A11y, QA sweep
- Lazy-load each tab/section via `DeferredSection`.
- Audit every `/account/*` route for: `<main>`, heading order, button labels, focus rings, contrast tokens, 44px tap targets, `h-dvh`.
- Add suspense skeletons, error boundaries, retry buttons.
- Lighthouse pass; fix CLS on hero/avatar.

---

## Technical notes
- All new colors via semantic tokens in `index.css` (no raw hex).
- Framer Motion presets: `stiffness: 400, damping: 30` (project standard).
- Haptics via `src/lib/haptics.ts` on primary CTAs and tab switches.
- Avatar storage: new private bucket `avatars` + RLS (owner upload/update/delete, public read URL), profile `avatar_url` column already exists on `profiles`.
- Reuse existing hooks: `useOrders`, `useLoyalty`, `useWallet`, `useReferrals`, `useNotifications`, `useSessions`, `useEmailPreferences`, `useWhatsAppPreferences`.
- No backend schema changes expected beyond the `avatars` storage bucket + RLS.

---

I'll start with **Batch 1 (Account Hub redesign)** on approval and proceed batch-by-batch, pausing after each so you can review the live preview.