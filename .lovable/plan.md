# Wholesaler Portal + Platform Hardening — Master Plan

A dedicated, installable, feature-rich **Wholesaler Portal** layered on top of the existing storefront, plus cross-cutting security and platform upgrades. Delivered in clearly-scoped phases, 2 batches per execution cycle.

---

## Goals

1. Approved B2B wholesalers get a separate, modern, app-like experience (PWA installable) with tier pricing, bulk ordering, credit/billing, logistics, and notifications.
2. Strict isolation from retail UX: separate routes, separate RLS scope, separate pricing, separate analytics.
3. Material hardening of security across the whole platform (authn, authz, rate limiting, abuse detection, audit, secrets).
4. Upgrade adjacent essentials: notifications, payments lifecycle, observability, and admin governance.

---

## Phase W — Wholesaler Foundation

### Batch W1 — Identity, Onboarding & Approval
- New role `wholesaler` in `app_role` enum + `has_role()` reuse (no role columns on profiles).
- Tables:
  - `wholesaler_accounts` (business_name, gstin, pan, billing_address, shipping_addresses jsonb, status: pending/approved/suspended, credit_limit, payment_terms_days, tier, approved_by, approved_at).
  - `wholesaler_documents` (KYC: GST cert, PAN, trade license, cancelled cheque).
  - `wholesaler_application_events` (audit trail).
- Public `/wholesale/apply` page (multi-step wizard, Zod-validated, hCaptcha).
- Admin console: approval queue, KYC viewer, credit limit setter, suspend/reactivate.
- Edge function `wholesaler-application-submit` (rate-limited, document virus-scan hook stub).
- Email + WhatsApp templates: received / approved / rejected / suspended.

### Batch W2 — Routing, Layout & Installable Shell
- Route group `/wholesale/*` guarded by `RequireWholesaler` (checks approved status server-side via RPC).
- Dedicated layout: condensed top bar, persistent left rail (Dashboard, Catalog, Cart, Orders, Invoices, Payments, Reports, Support, Settings).
- Separate manifest entry + PWA install prompt scoped to `/wholesale` (start_url, scope, theme color, monochrome icon).
- Distinct design token set under `html[data-portal="wholesale"]` (slate/steel + electric accent — clearly different from retail).
- Skeleton, command palette (`Ctrl/Cmd+K`) restricted to B2B actions.

---

## Phase C — Catalog, Pricing & Ordering

### Batch C1 — Tiered Pricing Engine
- Tables: `wholesale_price_tiers`, `wholesale_product_prices` (product_id, tier, moq, price, pack_size), `wholesale_customer_tier_overrides`.
- RPC `get_wholesale_price(product_id, qty, user_id)` returning unit price, applicable tier, MOQ violations.
- Catalog views with tier badge, MOQ, pack size, case quantity, lead time, stock-on-hand bucketed (>500/100-500/<100).
- CSV/Excel quick-order: paste SKUs+qty → validated preview → add to cart.

### Batch C2 — Bulk Cart, Quotes & Order Lifecycle
- B2B cart supports: per-line PO reference, requested delivery date, ship-to selection, split shipments.
- `wholesale_quotes` (RFQ) with admin negotiation chat, expiry, convert-to-order.
- `wholesale_orders` extending `orders` with: po_number, payment_terms, credit_used, approval_state.
- Order approval workflow when value > threshold or credit exceeded.
- Order timeline with sub-order/shipment fan-out reused from existing logistics.

---

## Phase B — Billing, Credit & Payments

### Batch B1 — Credit Ledger & Invoicing
- `wholesale_credit_ledger` (debit/credit, reason, ref). Atomic debit on order confirm, credit on payment/return.
- Invoice generator (GST-compliant) extends existing `invoices` with B2B fields (HSN per line, place of supply, IGST/CGST/SGST split, e-invoice IRN field ready).
- Statement-of-account PDF + monthly auto-email.

### Batch B2 — Payments & Reminders
- Payment intake: Razorpay (existing) + NEFT/RTGS instructions with reference id; manual reconcile screen.
- `payment_reminders_schedule` (T-3, T+0, T+3, T+7) → multi-channel (email, WhatsApp, push, in-app).
- Auto-hold new orders if overdue > X days; admin override with reason.
- Edge fn `wholesale-payment-reminder-runner` via pg_cron daily.

---

## Phase N — Notifications, Delivery & Engagement

### Batch N1 — Push & Real-Time
- Web Push subscriptions scoped to wholesaler endpoints (order status, low credit, invoice due, price changes on watched SKUs).
- In-portal real-time toasts via Supabase channels (`wholesale:user:{id}`).
- Notification preferences UI (per channel × per event matrix).

### Batch N2 — Delivery, Returns & Support
- Delivery: reuse India Post + Delhivery; B2B shipments support multi-box manifest and freight-on-account flag.
- Returns wizard tuned for bulk (line-level qty, reason codes, RMA PDF).
- Dedicated support inbox `wholesale_support_tickets` with SLA timers and dedicated KAM (key account manager) assignment.

---

## Phase S — Security Hardening (cross-cutting)

### Batch S1 — AuthN/AuthZ & Session
- Mandatory 2FA for `wholesaler` and all admin roles (TOTP; enforce on first login post-rollout).
- Step-up auth for: credit limit changes, payout/bank edits, large orders.
- Device trust + login anomaly detection (new IP/ASN/country → email + block until verified).
- Refresh `has_role` audits, drop any role checks not behind `SECURITY DEFINER`.

### Batch S2 — Edge & Abuse Controls
- Centralized rate-limit middleware for every edge function (token bucket in `api_rate_limit_policies`).
- hCaptcha on apply/login/forgot/quote endpoints.
- WAF-style rules: geo block, ASN block, UA heuristics → `security_detection_findings`.
- Idempotency keys enforced on all mutating B2B endpoints.
- Signed URL-only for invoice/RMA/statement PDFs; short TTL.
- CSP tightened (no `unsafe-inline` for scripts; nonce-based); SRI on third-party scripts.
- Secret rotation schedule surfaced in admin; alert at T-7.
- PII redaction confirmed in `error_logs`; add GSTIN/PAN to redaction list.

---

## Phase O — Observability, Admin & Platform

### Batch O1 — Wholesale Admin Console
- B2B Customer 360: credit utilization, DSO, top SKUs, churn risk, last contact.
- KAM workspace: tasks, call notes, next-action reminders.
- Pricing simulator: change tier → projected margin/volume impact.

### Batch O2 — Reliability & Reporting
- SLOs for B2B journeys (apply→approve, order→invoice, invoice→paid).
- Scheduled reports (CSV/XLSX) for sales, AR aging, top wholesalers, returns.
- Backups verification dashboard already exists — add wholesale tables to retention policy & restore drill checklist.
- Feature flags for every new module for safe rollout.

---

## Technical Notes

- **DB**: every new `public` table ships with GRANTs (`authenticated`, `service_role`; `anon` only where policy permits) and RLS using `has_role(auth.uid(),'wholesaler')` or `has_role(...,'admin')`.
- **Edge functions**: Zod validation, CORS, idempotency, rate limit, structured logging with request id.
- **Frontend**: code-split `/wholesale/*` via `React.lazy`; shared primitives only — no leaking retail design tokens.
- **PWA**: separate manifest `public/wholesale.webmanifest`, scope `/wholesale/`, install prompt component gated to approved users.
- **Testing**: Playwright smoke for apply→approve→order→invoice→pay→reminder loop.

---

## Execution Order (2 batches per cycle)

1. W1 + W2 — Identity, onboarding, installable shell
2. C1 + C2 — Pricing engine, bulk ordering & RFQ
3. B1 + B2 — Invoicing, credit ledger, payments & reminders
4. N1 + N2 — Push/real-time + delivery/returns/support
5. S1 + S2 — Security hardening across platform
6. O1 + O2 — Admin 360, KAM, reliability & reporting

Reply "go" to start with W1 + W2.
