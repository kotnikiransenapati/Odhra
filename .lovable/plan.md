# Odhra Production Hardening — Mega Plan

A single multi-phase plan. Each phase is independently shippable and reversible. We start with a real audit (no guessing), then fix in priority order: blockers first, polish last. Backend changes are allowed; admin / vendor / tracking / payment-core flows are treated as protected — we'll improve them only with explicit gates.

---

## Phase 0 — Audit (read-only, no code changes)

Goal: produce a single ranked issue list so the rest of the phases attack real problems, not imagined ones.

Audits to run:
1. **Supabase linter** — RLS gaps, missing GRANTs, public-exposed columns, recursive policies, unindexed FKs.
2. **Security scanner** (`security--run_security_scan`) — exposed data, weak policies, sensitive columns.
3. **SEO scanner** (`seo_chat--list_findings`) — meta/H1/canonical/JSON-LD issues.
4. **Edge-function inventory** — list all 28 functions, check `verify_jwt` correctness, CORS, input validation (zod), rate limiting.
5. **Mobile UI sweep** at 320 / 360 / 375 / 414 px on the 12 highest-traffic routes: `/`, `/shop`, `/product/:slug`, `/cart`, `/checkout`, `/order-success`, `/customer/orders`, `/customer/wallet`, `/customer/rewards`, `/wishlist`, `/auth`, `/admin`.
6. **Dead/broken feature sweep** — every floating widget, popup, badge, and CTA on the homepage and PDP gets a "does this actually do something useful?" verdict.
7. **Console + network sanity** — capture every error/warning on the 12 routes above.

Output: a markdown audit report committed to `/mnt/documents/audit-report.md` with severity (P0/P1/P2), affected files, and proposed fix per issue. **No code changes in Phase 0.** User reviews report and confirms scope before Phase 1 starts.

---

## Phase 1 — P0 mobile alignment & broken UI (frontend only)

Scope: only items the audit marked P0 for mobile (≤640px) alignment, overflow, tap-target, or visually broken state. Frontend/CSS only. Pages most likely to need work:

- `Navbar` + `MegaMenu` — hamburger drawer, search overlap, profile dropdown z-index.
- `BottomNavigation` — safe-area insets (`pb-[env(safe-area-inset-bottom)]`), active state, overlap with floating chat/widget.
- `Checkout` — address form steps overflowing, sticky summary covering CTA, Razorpay modal scroll lock.
- `ProductDetail` — image gallery aspect ratio, variant selector wrap, sticky add-to-cart bar.
- `Cart` + `CartDrawer` — quantity stepper crowding, promo input overflow.
- `Auth` — OTP input misalign, social buttons stack.
- Customer pages (`Orders`, `Wallet`, `Rewards`) — table → card pattern on mobile.
- All toast/dialog widths capped with safe gutters (already started — finish the sweep).

Rule: no business logic changes in this phase. Pure presentation.

---

## Phase 2 — Checkout & order pipeline hardening (frontend + edge functions)

The single most revenue-critical pipeline. Tighten end-to-end:

1. **Idempotency everywhere** — `create-cod-order` already uses `idempotency_key`; verify `create-razorpay-order` + `verify-razorpay-payment` are also idempotent against retries. Add unique index on `orders.idempotency_key` if missing.
2. **Stock locking** — confirm `SELECT ... FOR UPDATE` on `products.stock` and `flash_sale_products.quantity_sold` in both Razorpay and COD paths. Add automated test.
3. **Cart reservation** — when `CartReservationTimer` expires, actually release reserved stock (currently UI-only on some paths).
4. **Webhook resilience** — `razorpay-webhook` must be replay-safe (use `payment_reconciliation` table). Add 4xx vs 5xx discipline so Razorpay retries correctly.
5. **Order email + invoice** — verify `generate-invoice-pdf` trigger fires on every paid order; add dead-letter logging to `error_logs` on failure.
6. **Sub-order split** — multi-vendor orders correctly fan out to `sub_orders` with vendor `wallet_transactions` on delivery.
7. **Guest checkout** — confirm `customer_id` is nullable end-to-end and order lookup-by-email works for guests.
8. **OrderSuccess page** — fetch by order_id, retry with backoff, show fallback if invoice still generating.

Tests: extend `vitest` suite for `useCheckout`, `useStockValidation`, and add Deno tests for the three checkout edge functions.

---

## Phase 3 — Security & RLS hardening (DB migrations + edge functions)

Driven entirely by Phase 0 scan output. Expected categories:

1. **RLS gaps** — any public-schema table with RLS disabled or with a permissive `USING (true)` policy gets tightened. Use `has_role()` SECURITY DEFINER pattern (already established) to avoid recursion.
2. **Missing GRANTs** — every flagged table gets a corrective `GRANT` migration.
3. **Sensitive columns** — PII columns (`email`, `phone`, `address`) on customer tables must require `auth.uid() = user_id` or admin role; vendor PII never exposed to other vendors.
4. **Edge function auth** — every function that touches user data must validate JWT via `getClaims()` (per knowledge). Webhooks must validate provider signatures.
5. **Input validation** — add `zod` schemas to every edge function body parser. 400 on parse failure.
6. **Rate limiting** — `rate_limits` table exists; wire it into auth, OTP, contact, newsletter, spin-wheel, and review-submit functions.
7. **CSP & headers** — review `index.html` CSP whitelist; tighten `script-src` to known origins only (Razorpay, Algolia, GA4, Sentry).
8. **Leaked-password protection** — enable HIBP check via `configure_auth`.

Each finding either gets fixed and marked, or ignored with a documented justification recorded via `security--update_memory`.

---

## Phase 4 — Backend resilience & observability

1. **Global error reporter** — confirm `globalErrorReporter.ts` logs to `error_logs` with safe truncation; add Sentry breadcrumbs for failed mutations.
2. **API error handler** — `apiErrorHandler.ts` exponential backoff applied to every TanStack Query mutation that hits an edge function.
3. **Offline queue** — verify `useOfflineSync` replays cart, wishlist, review-draft, and address mutations after reconnect.
4. **Web Vitals reporter** — already wired; surface LCP/INP/CLS in admin marketing dashboard.
5. **Health-check endpoint** — extend `health-check` edge function to ping DB, Resend, Razorpay, Algolia; surface red/green on admin home.
6. **Realtime channels** — audit Supabase subscriptions for cleanup on unmount (memory leaks on `LiveChat`, `feature_flags`, `Notifications`).

---

## Phase 5 — Feature audit: kill / fix / promote

For every "gimmick" feature, decide one of three verdicts:

- **Kill** — feature flag → `false` by default; component lazy-removed.
- **Fix** — repair the broken path; add tests.
- **Promote** — works correctly, surface it more prominently with psychology hooks.

Candidates for verdict (final list comes from Phase 0):
- Spin Wheel, Daily Check-in, Challenges, Leaderboard, Achievements
- Live Purchase Notification, Exit Intent Popup, Promo Popup, Welcome Popup
- Smart Install Prompt, Cookie Banner, Notification Permission Prompt
- Share & Earn, Referral Dashboard, Affiliate links
- Voice Search, Algolia autocomplete, Smart Nav Shortcuts
- Cart Sharing, Wishlist Sharing, Shared Carts
- A/B testing engine, Banner auto-winner

Output: a single `feature_flags` migration that turns off everything in the Kill bucket; PRs that repair everything in Fix; psychology pass on Promote.

---

## Phase 6 — Conversion psychology polish

Only after pipelines work. Apply or strengthen these patterns where the audit shows weak conversion signal:

- **Scarcity**: low-stock badge thresholds tunable per category.
- **Loss aversion**: "₹X saved" anchor, cart reservation visible timer.
- **Social proof**: viewer counts, recent purchase ticker, verified-buyer review badges.
- **FOMO**: flash-sale countdowns, exit-intent dynamic discount escalation.
- **Reciprocity**: loyalty points preview on PDP ("Earn 23 points").
- **Endowed progress**: checkout step indicator, tier progress on rewards page.
- **Authority**: trust badges row above checkout CTA (Razorpay Secure, India Post, COD available).
- **Variable reward**: spin wheel post-purchase trigger.

All driven by `feature_flags` so we can A/B test and roll back per pattern.

---

## Phase 7 — Productivity & performance pipeline

- **Code-split** every admin/vendor sub-route via `lazyRetry`.
- **Image pipeline** — keep raw Supabase URLs (per memory) but add `loading="lazy"` + `decoding="async"` + explicit width/height everywhere; use `aspect-*` to lock CLS.
- **Route preloader** — extend `routePreloader.ts` to preload `/shop` from `/`, `/product` from `/shop`, `/checkout` from `/cart`.
- **Bundle audit** — `bun run build` + size-limit report; flag any chunk > 200 KB gz.
- **DB indexes** — confirm indexes on `orders.user_id`, `orders.created_at`, `order_items.order_id`, `products.vendor_id`, `products.is_active`, `reviews.product_id`. Add any missing.
- **Realtime quota** — audit subscription count per route; consolidate where possible.

---

## Phase 8 — Test & verification gates

Before any phase ships:
1. `vitest run` green (current 47 tests + new ones).
2. Manual browser sweep at 360 × 800 mobile viewport on the 12 P0 routes.
3. `supabase--linter` clean for any DB changes.
4. `security--run_security_scan` shows no new high/critical findings.
5. Smoke test: signup → add to cart → COD checkout → order success → invoice download → cancel order. End-to-end every release.

---

## Protected zones (touch only with explicit gate per memory)

| Zone | Rule |
|---|---|
| Admin RBAC + permissions | No layout/permission edits without confirmation per change |
| Vendor onboarding + KYC | Schema frozen unless explicitly requested |
| Behavior tracking + analytics | No event-name renames; additions only |
| Razorpay/COD core handlers | Idempotency + signature changes only; no business-logic rewrites |
| Shiprocket/Stripe code paths | Stay disabled (per memory: India Post + Delhivery only) |

---

## Rollout order & "done" definition

```text
Phase 0  Audit                 →  audit-report.md committed
Phase 1  Mobile P0             →  every P0 alignment fixed; visual diff approved
Phase 2  Checkout pipeline     →  end-to-end smoke green; tests added
Phase 3  Security & RLS        →  scanner clean; security-memory updated
Phase 4  Resilience            →  health-check green; Sentry receiving events
Phase 5  Feature audit         →  flags migration shipped; killed features dark
Phase 6  Psychology polish     →  patterns live behind flags; baseline metrics captured
Phase 7  Performance           →  LCP < 2.5s, INP < 200ms on /, /shop, /product/:slug
Phase 8  Verification gates    →  permanent CI checks
```

Each phase ends with a one-line changelog entry in `/mnt/documents/release-notes.md` so you have a paper trail.

---

## What I need from you to start

After approving this plan, I'll begin **Phase 0** immediately — pure read-only audit, no code touches. You'll see the report in chat + as a downloadable artifact, then you pick what goes into Phase 1.
