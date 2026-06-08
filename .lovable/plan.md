# Phase 3 — Vendor Panel Polish

Goal: bring `/vendor/*` up to the same Bold & Editorial standard as the customer panel — fast, accessible, conversion- and operations-driven, with URL-synced state, haptics, motion, and a11y landmarks.

Pages in scope:
- VendorDashboard.tsx
- VendorOrders.tsx
- VendorProducts.tsx
- VendorProductForm.tsx
- VendorAnalytics.tsx
- VendorWallet.tsx
- VendorSettings.tsx
- VendorOnboarding.tsx

---

## Batch 1 — Dashboard hero & KPI grid (`VendorDashboard.tsx`)
- Personalized hero: store logo, name, KYC/active status chip, performance score.
- KPI grid: today's revenue, pending orders, low-stock count, payout balance, rating.
- Quick actions: Add product, Process orders, Withdraw, View store.
- Skeletons, motion stagger, haptics on tap, `<main>` landmark.

## Batch 2 — Orders ops UX (`VendorOrders.tsx`)
- URL-synced status filter chips + search (?status=, ?q=).
- Bulk select + bulk status update / print labels.
- Per-row quick actions: mark shipped, print slip, message buyer.
- Sticky filter rail, infinite scroll, empty/error states.

## Batch 3 — Catalog management (`VendorProducts.tsx` + `VendorProductForm.tsx`)
- Products grid: search, status filter, stock filter, sort (newest, best-selling, low-stock).
- Inline stock edit + quick publish/unpublish toggle.
- Form: stepper layout (Basics → Media → Pricing → Inventory → SEO) with zod validation, autosave-draft, image reorder.

## Batch 4 — Analytics & Wallet (`VendorAnalytics.tsx` + `VendorWallet.tsx`)
- Analytics: revenue trend, top products, conversion funnel, AOV, returns rate, period selector synced to URL.
- Wallet: balance card, payout history with status chips, withdraw CTA with min-threshold validation, transaction filters.

## Batch 5 — Settings & Onboarding (`VendorSettings.tsx` + `VendorOnboarding.tsx`)
- Settings tabs: Store Profile / KYC / Bank / Shipping / Notifications / Policies (URL-synced).
- Onboarding wizard polish: progress bar, validated steps, resume from last step, completion celebration.

## Batch 6 — Cross-cutting QA sweep
- Every page: `<main>`, heading order, focus rings, 44px tap targets, `min-h-dvh`, contrast tokens.
- Suspense skeletons, error boundaries, retry buttons.
- Lighthouse + a11y audit.

---

## Technical notes
- Reuse hooks: `useVendorDashboard`, `useOrders`, `useInventory`, `useInvoiceDownload`, `useDeliverySlip`, `useShipments`.
- Logistics: India Post / Delhivery only (no Shiprocket, no Stripe).
- Framer Motion stiffness 400 / damping 30; haptics on primary CTAs and tab/filter changes.
- URL-synced state via `useSearchParams` consistent with customer panel pattern.
- No backend schema changes expected; surface existing vendor RLS and triggers.

Starting with **Batch 1 (Vendor Dashboard)** on approval and proceeding batch-by-batch.
