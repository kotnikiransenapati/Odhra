# Production Readiness & Panel Upgrade Plan

A phased plan to take the platform to production grade: harden security, polish every panel (Customer, Admin, Vendor, Wholesale), and complete backend pipelines. Each phase is independently shippable.

---

## Phase 1 — Security & Compliance Hardening

**Goals:** zero critical findings, audited surface area, safe-by-default backend.

- Run full security scan + DB linter; resolve every High/Critical finding.
- Audit RLS on all 130+ tables: verify `SECURITY DEFINER` helpers (`has_role`, `is_vendor_active`) are used everywhere; no role checks against `profiles`.
- Enforce GRANTs review on every public table (anon vs authenticated vs service_role).
- Edge functions: enable Zod validation, rate-limiting via `rate_limits` table, JWT verification in code (signing-keys).
- Auth: enable HIBP leaked-password check, MFA self-cleanup audit, 15-day session timeout verified, password reset page tested.
- Secrets review via `fetch_secrets`; remove unused, rotate Razorpay/Resend/Algolia keys.
- CSP audit in `index.html` + sanitizer review (`sanitizeText` / DOMPurify usage).
- PII redaction in `error_logs`, `audit_logs`, analytics tables.
- Add GDPR data-export + account-deletion edge functions.

## Phase 2 — Customer Panel (Storefront + Account)

**Goals:** Flipkart-class polish, conversion, retention.

- **Account hub redesign:** unified dashboard — Orders, Subscriptions, Returns, Wallet, Loyalty, Referrals, Addresses, Saved Cards, Notifications, Privacy.
- **Order timeline 2.0:** live India Post/Delhivery tracking on a vertical timeline, ETA, proactive delay alerts, one-click cancel/return/reorder.
- **Wallet & Loyalty center:** points ledger, redemption catalog, tier progress, expiring-points warnings.
- **Smart recommendations rail** across Home, PDP, Cart, Empty states (uses existing 40/35/25 AI engine).
- **PDP upgrades:** sticky add-to-cart on mobile, variant matrix, bundle/cross-sell, delivery ETA by pincode, stock urgency, review media gallery.
- **Cart & Checkout:** address book with default, COD vs Prepaid comparison, dynamic shipping/tax preview, EMI display, retry-failed-payment, guest checkout polish.
- **Notification center** in-app (bell icon) consolidating push + email + WhatsApp history.

## Phase 3 — Admin Panel

**Goals:** operate the whole business from one cockpit.

- **Command center dashboard:** revenue, AOV, conversion funnel, RTO%, vendor SLA, support queue, fraud signals — all real-time via Supabase channels.
- **Orders workbench:** bulk actions, split-shipment view, refund/credit-note flow, dispute integration, India Post bulk label generation.
- **Catalog studio:** product editor with variant matrix, bundle builder, pricing-rule simulator, bulk CSV/PDF import with preview/diff.
- **Customer 360 v2:** LTV, churn risk, next-purchase predictor, segments, manual reward grant, support thread, order/return history.
- **Marketing hub:** Promotions, Flash Sales, Spin Wheel, A/B banners, Email/Push/WhatsApp campaigns, Cart-recovery rules, Referral & Affiliate tuning.
- **CMS studio:** drag-order homepage sections, banners, hero A/B, category tabs, deal banners.
- **RBAC manager:** 76+ permissions UI, role templates, audit-log search with diff view.
- **Feature-flag console:** the 51 flags grouped, with dependency hints and rollout %.
- **Observability:** error_logs viewer, edge-function logs surfaced, performance metrics.

## Phase 4 — Vendor Panel

**Goals:** self-serve, performance-aware vendor ops.

- **Vendor dashboard:** sales, payouts, wallet, performance score (On-Time 30 / Rating 25 / Cancel 25 / Return 20) with coaching tips.
- **Onboarding wizard 2.0:** KYC docs, bank, GST, pickup address, shipping prefs, payout schedule — progress bar resumable.
- **Catalog tools:** product CRUD, bulk image/PDF catalog import (existing 5-step flow), inventory by location, low-stock alerts, forecast view.
- **Order workbench:** sub-order queue, accept/pack/ship, bulk label print, return approvals, dispute responses.
- **Payouts & wallet:** transaction ledger, payout requests, invoice downloads, GST reports.
- **Storefront editor:** public `/store/:slug` theme, banner, about, policies.
- **Support inbox:** vendor-admin tickets + customer messages threaded.

## Phase 5 — Wholesale / B2B Panel (new)

**Goals:** unlock B2B revenue with separate pricing and approval flows.

- **B2B account model:** `wholesale_accounts` table (business name, GSTIN, PAN, credit limit, terms), approval workflow, dedicated `wholesale` role.
- **Tiered pricing:** MOQ, slab pricing, customer-group prices via existing `pricing_rules` extended.
- **Quote-to-order pipeline:** RFQ form → admin quote builder → customer accept → order; PDF quote export.
- **Net-terms checkout:** Net-15/30/45 with credit-limit gating; invoice on delivery.
- **Bulk-order tools:** CSV upload to cart, repeat-order templates, scheduled recurring POs (extends `subscriptions`).
- **Wholesale catalog view:** SKU table, pack sizes, MOQ, lead times, bulk add-to-cart.
- **Dedicated `/wholesale` storefront** with auth-gated pricing and B2B-only banners.

## Phase 6 — Backend Pipelines & Flows

- **Order lifecycle pipeline:** pending → paid/escrow → packed → shipped → delivered → completed, with auto-triggers for invoice, wallet credit, loyalty, review request.
- **Cart recovery pipeline:** 30m / 6h / 24h drips, email + WhatsApp + push, discount escalation 5→10→15%, A/B variant logging.
- **Returns/refund pipeline:** request → vendor approve → pickup → QC → refund (Razorpay) or store credit + credit-note PDF.
- **Inventory pipeline:** movements → forecasts (velocity) → low-stock alerts → reorder suggestion.
- **Vendor payout pipeline:** delivered sub-order → wallet credit → weekly auto-payout request → admin approve → bank transfer log.
- **Fraud pipeline:** signal capture → rule engine → score → manual review queue.
- **Analytics pipeline:** behavior events → user_behavior_profiles → segments → marketing campaigns.
- **Cron jobs (pg_cron):** abandoned-cart sweep, subscription renewals, inventory forecast, payout cycle, scheduled reports, spin-wheel expiry cleanup.

## Phase 7 — UI System & Performance

- Design tokens audit: ensure no hardcoded colors outside swatches/shadcn overlays.
- Skeleton + shimmer coverage on every async surface.
- Framer Motion spring (400/30) consistency; haptic feedback on primary CTAs.
- Route-level code splitting + `DeferredSection` on heavy panels.
- Image strategy: raw Supabase URLs, `object-contain`, srcset where applicable.
- Lighthouse pass: LCP < 2.5s, CLS < 0.1, TBT < 200ms on mobile.
- a11y pass: focus rings, ARIA, contrast AA, keyboard nav across all panels.

## Phase 8 — QA, Observability, Launch

- E2E happy paths per panel (Playwright-style manual scripts).
- Edge-function load tests on checkout, search, recommendations.
- Sentry-style error monitoring already in `globalErrorReporter` — add dashboards.
- Status page + maintenance gate already present — verify toggles.
- Backup/restore drill on DB; document RPO/RTO.
- Final security re-scan + linter pass — must be clean before launch.

---

## Technical Notes (for the implementer)

- **No RLS regressions:** every new table follows CREATE → GRANT → ENABLE RLS → POLICY using `SECURITY DEFINER` helpers.
- **No Shiprocket/Stripe:** logistics stays India Post/Delhivery; payments stay Razorpay + COD.
- **Feature flags:** every new surface ships behind a flag in `feature_flags` and is wired via `useFeatureFlag`.
- **Edge functions:** Zod validation, CORS via `npm:@supabase/supabase-js@2/cors`, JWT validated in code.
- **State:** TanStack Query for server state, Supabase Realtime for live panels.
- **Routing:** lazy + `lazyRetry`; admin/vendor/wholesale under their own layouts and route guards.
- **Migrations:** schema-only via migration tool; data via insert tool.

## Suggested Execution Order

1. Phase 1 (Security) — blocker for prod.
2. Phase 6 pipelines audit in parallel with Phase 2 (Customer).
3. Phase 3 (Admin) → Phase 4 (Vendor) → Phase 5 (Wholesale, new build).
4. Phase 7 polish, Phase 8 QA & launch.

Reply with **"approve plan"** to proceed, or tell me which phases to reorder, drop, or expand.
