# Odhra · Full Audit & Advanced Roadmap

A platform-wide review across **51 pages, 80 admin components, 84 hooks, 29 edge functions, 130+ tables**. Findings are grouped by panel, then translated into 8 prioritized build phases.

---

## 1. Audit Findings

### 1.1 Cross-cutting (platform)

| # | Area | Finding | Severity |
|---|---|---|---|
| C1 | Edge functions | `create-stripe-checkout`, `stripe-webhook`, `shiprocket-proxy` still exist — violate Core constraints (no Stripe / no Shiprocket). | High |
| C2 | Observability | Errors flow into `error_logs` but no SLO / alert rules. No anomaly detection. | High |
| C3 | Caching | React Query used without consistent `staleTime` / `gcTime` defaults → over-fetching. | Medium |
| C4 | Bundle | 51 pages, only some lazy-loaded. No route-level prefetch on hover. | Medium |
| C5 | a11y | Several icon-only buttons missing `aria-label`; `h-screen` used instead of `h-dvh` on a few full-height layouts. | Medium |
| C6 | Realtime | Subscribed channels not always cleaned up (memory leaks in long sessions). | Medium |
| C7 | i18n | Translation table exists, but ~30% of customer copy is hardcoded English. | Low |
| C8 | Rate limiting | `rate_limits` table exists but only enforced on a subset of edge functions. | High |
| C9 | Secrets | A few client components read env keys that should be server-only. | High |

### 1.2 Customer panel

| # | Finding |
|---|---|
| CU1 | No unified order timeline component — `/track-order`, `/orders/:id`, email all render differently |
| CU2 | Wishlist lacks "back-in-stock" hook integration with `product_waitlist` |
| CU3 | Cart has no saved-for-later bucket |
| CU4 | Address book missing PIN-code auto-fill via `indiapost_pincode_cache` |
| CU5 | Loyalty wallet shows totals but not point-expiry warnings |
| CU6 | Reviews flow doesn't surface "verified buyer" badge until refresh |
| CU7 | PWA install nudge fires too aggressively; no escalation cooldown |

### 1.3 Vendor panel

| # | Finding |
|---|---|
| V1 | Onboarding has no progress persistence across devices (only local state) |
| V2 | Product form lacks bulk variant generator (size × color matrix) |
| V3 | Order fulfilment view does not surface SLA breach countdown |
| V4 | No payout forecast — vendor sees current balance only |
| V5 | KYC: PAN/Aadhaar uploaded but no OCR validation; admin reviews blindly |
| V6 | Analytics page lacks compare-period and product-level conversion funnel |
| V7 | No vendor-side "Insights" digest emailed weekly |

### 1.4 Admin panel

| # | Finding |
|---|---|
| A1 | 80 components but no command palette (Cmd+K) for quick navigation |
| A2 | Order management lacks split-screen (list + detail drawer) flow |
| A3 | Vendor KYC review queue has no SLA timer / aging buckets |
| A4 | Refunds / disputes need bulk-action toolbar |
| A5 | Audit log search exists but no diff view per row |
| A6 | RBAC: roles editable but no "test as role" preview mode |
| A7 | System health dashboard missing edge function latency p95 |
| A8 | Cohort retention dashboard cannot be exported / scheduled |
| A9 | No global broadcast / maintenance banner controller |

### 1.5 Backend & data

| # | Finding |
|---|---|
| B1 | Multiple tables (e.g. `customer_segment_members`, `email_campaign_logs`) only have 1 policy — needs audit |
| B2 | `orders` has 31 columns but no covering index on `(customer_id, created_at desc)` |
| B3 | No nightly job for `compute_inventory_forecasts` and `vendor_performance_metrics` |
| B4 | No DLQ for failed edge function executions |
| B5 | `analytics_events` grows unbounded — needs partitioning + retention policy |

---

## 2. Phased Roadmap

Each phase is shippable in 1–2 builds. Phases are ordered by **risk reduction → vendor revenue → admin efficiency → customer delight**.

### Phase A · Hygiene & Constraints (risk reduction)
- Remove `create-stripe-checkout`, `stripe-webhook`, `shiprocket-proxy` and any UI references.
- Promote any client-side secret reads to edge functions.
- Add React Query global defaults (`staleTime: 30s`, `gcTime: 5m`).
- Realtime subscription cleanup audit (`useEffect` returns).
- Add `rate_limits` enforcement helper used by all public edge functions.

### Phase B · Observability & Reliability
- SLO config table + `system_alerts` with thresholds (error rate, p95 latency, queue depth).
- Edge function latency capture → `function_metrics` table; surface p50/p95 in System Health.
- Failed-job DLQ table + admin replay UI.
- Partition `analytics_events` monthly + 180-day retention job.

### Phase C · Admin Productivity
- **Command palette** (Cmd+K) across `/admin` with fuzzy routing + recent actions.
- Orders **split-pane** layout: list left, drawer right, keyboard nav (`j/k`, `e`, `r`).
- KYC queue with aging buckets (<24h / 1-3d / >3d) and SLA badges.
- Bulk-action toolbar for refunds & disputes (approve, reject, escalate, export).
- Audit log row-level **diff viewer** (before/after JSON).
- "Test as role" simulator for RBAC.
- Global broadcast banner controller (CMS → site-wide notice).

### Phase D · Vendor Growth Suite
- Cross-device onboarding progress in `vendor_onboarding_progress` (already exists — wire to UI).
- Bulk **variant matrix generator** in product form.
- Order fulfilment **SLA countdown** chip (uses `social_links.dispatch_sla`).
- **Payout forecast** widget: pending × velocity → next 4 weeks projection.
- KYC OCR helper edge function (Tesseract or Google Vision) → pre-fills name / number.
- Analytics: compare-period toggle + per-product funnel (view → cart → buy).
- Weekly insights email via `send-email` cron.

### Phase E · Customer Experience
- Unified **OrderTimeline** component reused in track, detail, email.
- **Saved for later** bucket in cart; persisted in `carts.meta`.
- **Back-in-stock** trigger using existing `product_waitlist`.
- Address PIN auto-fill via `indiapost_pincode_cache`.
- **Loyalty expiry** warning + redemption nudges (90 / 30 / 7 days).
- Verified-buyer badge surfaced optimistically.
- Smart PWA install prompt with the escalating cooldown already in Core (1/3/7/14 d).

### Phase F · Search & Discovery
- Algolia: typo tolerance + synonym dictionary (admin UI).
- Vendor / category landing pages with auto-curated "Trending in".
- "Similar products" via `product_associations` on PDP scroll.

### Phase G · Backend Hardening
- Add covering indexes: `orders(customer_id, created_at desc)`, `sub_orders(vendor_id, status)`, `analytics_events(event_type, created_at)`.
- RLS audit: every table reviewed; add missing service_role grants; flag tables with <2 policies.
- Nightly cron: refresh forecasts, vendor scorecards, segment members.
- Webhook idempotency: `webhook_events` ledger with unique `(provider, event_id)`.

### Phase H · Polish & a11y
- Replace remaining `h-screen` with `h-dvh`.
- Audit icon-only buttons → `aria-label`.
- Skeleton loaders standardized via single `TableSkeleton` / `CardSkeleton`.
- Route-level prefetch on link hover.
- Lighthouse pass: target ≥ 90 on mobile for Home, Shop, PDP, Cart.

---

## 3. Technical Notes

- **No new core dependencies** unless a phase explicitly requires (e.g. `cmdk` for palette — already in shadcn).
- **Migrations**: each phase that touches schema ships a single migration with GRANTs, RLS, and indexes per Core rules.
- **Edge functions**: latency capture wraps existing handlers via a `withMetrics()` helper in `_shared`.
- **Realtime**: refactor to a `useRealtimeChannel(name, handler)` hook that auto-unsubscribes.
- **Constraints respected**: India Post / Delhivery only, no Stripe, raw Supabase URLs, 15-day session timeout, ₹1000 free-ship threshold, 1pt/₹10.

---

## 4. Suggested Build Order

```text
A → B → C (admin) ─┐
                   ├─→ G (hardening) → H (polish)
D (vendor) → E ────┘
F runs anytime after E
```

Reply with **"start A"** (or any phase letter) and I will implement that phase end-to-end (DB + backend + UI + pipeline). Or pick specific items, e.g. *"do C1, C3, D2"*.
