# Production-Readiness Roadmap (Phase I → N)

Phase H (admin managers) is complete. The remaining work is grouped into 6 phases, each split into 2-batch increments matching our current cadence. Total: **~30 batches**.

---

## Phase I — Storefront Conversion & UX Polish (5 batches)

Goal: Match Amazon/Flipkart-level shopping UX.

- **I1** Product Detail v2: sticky buy box, variant matrix swatches, size guide modal, delivery ETA by pincode (India Post RPC), EMI calculator.
- **I2** PDP social proof: live "X viewing now", verified-buyer badge on reviews, Q&A inline, photo/video review carousel, sentiment summary (Lovable AI).
- **I3** Cart v2: saved-for-later, gift wrap, applied-offer breakdown, "you saved ₹X" ribbon, undo-remove toast, stock-warning banners.
- **I4** Checkout v2: address auto-detect via geolocation, saved address cards, COD eligibility check, prepaid discount nudge, order-summary sticky on mobile.
- **I5** Search v2: typo-tolerant + synonyms, autosuggest with thumbnails, recent + trending, voice mic on mobile, zero-result recovery (related categories).

## Phase J — Mobile App Shell (iOS + Android) (4 batches)

Goal: Capacitor-wrapped PWA that ships to App Store / Play Store.

- **J1** Capacitor setup, splash/icons, status-bar theming, safe-area insets, deep-link scheme `odhra://`, universal links config.
- **J2** Native plugins: push (FCM/APNs), haptics, biometric login (Face ID/fingerprint), share sheet, camera for review uploads.
- **J3** Offline-first: cache PDPs, queue cart mutations via existing IndexedDB layer, optimistic UI for wishlist/cart, sync banner.
- **J4** Store-readiness: privacy manifest (iOS 17), Play Data Safety form, in-app review prompts, app-tracking transparency, screenshots/listing copy.

## Phase K — Payments, Tax & Invoicing Hardening (4 batches)

- **K1** Razorpay Routes for vendor split-settlement, partial refunds, dispute webhook, payment reconciliation cron.
- **K2** UPI intent + QR fallback, Net Banking, wallets (Paytm/PhonePe), saved card tokenization, payment retry on failure.
- **K3** GST: HSN/SAC per product, CGST/SGST/IGST computation by ship-to state, GSTIN capture for B2B, reverse-charge flag.
- **K4** Invoice/Credit-note PDFs v2 (GST-compliant, QR), e-invoice IRN API stub, monthly GSTR-1 export CSV, vendor tax report finalization.

## Phase L — Logistics, Fulfillment & Returns (4 batches)

- **L1** Delhivery + India Post unified shipping engine: rate-shopping, auto-select cheapest, manifest generation, pickup scheduling.
- **L2** Multi-warehouse fulfillment: route order items to nearest inventory_location, split shipments, partial dispatch tracking.
- **L3** Returns pipeline: reverse pickup booking, QC checklist on receipt, refund auto-trigger on QC pass, store-credit option, RTO handling.
- **L4** Customer tracking page: live map (Delhivery webhook), SMS/WhatsApp/email milestones, delay alerts, delivery OTP.

## Phase M — Growth, Marketing & Analytics (5 batches)

- **M1** Recommendation engine v2: "Customers also bought", "Recently viewed", personalized homepage rails powered by user_behavior_profiles.
- **M2** Email/WhatsApp/Push lifecycle journeys: welcome, browse-abandon, cart-abandon escalation, post-purchase, win-back, replenishment.
- **M3** Loyalty v2: tier perks UI, points expiry warnings, referral leaderboard, birthday rewards auto-issue, challenges gamification.
- **M4** SEO/AEO: sitemap.xml + robots.txt edge functions, product/breadcrumb/FAQ JSON-LD, hreflang for i18n, OG image generator.
- **M5** Analytics: GA4 + Meta CAPI server-side events, attribution dashboard, funnel/cohort views, A/B framework UI for any component.

## Phase N — Security, Compliance & Reliability (4 batches)

- **N1** WAF-layer: per-route rate-limits, bot detection (UA + behavior), reCAPTCHA Enterprise on auth/checkout, IP allow/deny enforcement.
- **N2** Secrets/keys rotation jobs, signed-URL audit, RLS regression test suite (pgTAP), penetration-test fix queue.
- **N3** Compliance: DPDP Act (India) consent center, GDPR DSR portal (export/delete), cookie banner v2, age-gate where required, terms versioning.
- **N4** Reliability: SLO dashboards, DLQ replay UI, incident.io-style status page (incidents table already exists), automated runbooks, chaos test scripts.

---

## Cross-cutting Technical Standards (applied every batch)

- **Backend**: all new tables follow `CREATE → GRANT → RLS → POLICY`; `SECURITY DEFINER` helpers; idempotency keys on mutations; Zod validation in edge functions; PII redaction in logs.
- **UI**: semantic design tokens only (deep navy / warm pink), Framer Motion (stiffness 400 / damping 30), `xs` breakpoint, skeleton shimmers, haptics on key actions.
- **Pipeline**: feature-flag gated, audit-logged, observable via existing SLO/heartbeat framework, behind RBAC permission, lazy-loaded route.
- **Mobile**: every new screen verified at 375px and inside Capacitor shell.

## Suggested Order

I → K → L → J → M → N
(Storefront polish first to lift conversion, then payments/logistics to handle volume, then mobile shell, then growth, then hardening.)

## Next Step

Reply **"start I"** and I'll ship batches **I1 + I2** with full backend + UI + pipeline + security, then report batches remaining.
