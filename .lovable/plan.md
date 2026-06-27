# Production & Portable-Hosting Upgrade Plan

Goal: take Odhra from "feature-rich preview" to a hardened production e-commerce platform that can be deployed to **any modern host** (Vercel, Netlify, Cloudflare Pages, AWS Amplify, Render, Fly.io, Docker/VPS) and connected to **any swappable service** (payments, search, email, SMS, analytics, CDN, error tracking) through clean adapters and env-driven config.

Delivered in **6 phases / ~14 batches**, each shippable independently.

---

## Phase P1 — Environment & Config Hardening (2 batches)

**P1.1 — Typed env layer**
- Add `src/lib/env.ts` using Zod to parse `import.meta.env`. Fail fast in dev, warn in prod.
- Move every hardcoded URL, key, feature toggle to env vars (`VITE_SITE_URL`, `VITE_SUPABASE_*`, `VITE_RAZORPAY_KEY_ID`, `VITE_GA4_ID`, `VITE_SENTRY_DSN`, `VITE_ENABLE_*`).
- Add `.env.example` + `.env.production.example` documenting every variable.

**P1.2 — Host-agnostic site URL & SEO**
- Replace remaining `odhra1.lovable.app` literals with `getSiteBaseUrl()` driven by `VITE_SITE_URL`.
- Edge function `SITE_URL` already supported — document override per environment.
- Generate `sitemap.xml`, `robots.txt`, and OG image URLs from the same base.

---

## Phase P2 — Build & Deploy Portability (3 batches)

**P2.1 — Universal build output**
- Confirm Vite SPA build works as static. Add `_redirects` (Netlify/CF Pages) + `vercel.json` rewrites + `staticwebapp.config.json` so SPA deep links 200 everywhere.
- Add `public/_headers` for security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy).

**P2.2 — Containerized deploy**
- Add multi-stage `Dockerfile` (node-builder → nginx-alpine) + `nginx.conf` with SPA fallback, gzip/brotli, cache-control.
- Add `docker-compose.yml` for local prod simulation.
- Add `fly.toml` and `render.yaml` examples.

**P2.3 — CI/CD templates**
- `.github/workflows/ci.yml`: typecheck, lint, vitest, build, Lighthouse CI budget.
- `.github/workflows/deploy.yml` matrix examples for Vercel / Netlify / Cloudflare / Docker registry.
- Preview deployments on PRs, prod on `main`.

---

## Phase P3 — Service Adapter Layer (3 batches)

Make every external dependency swappable behind a thin interface so hosts/providers can change without code rewrites.

**P3.1 — Payments adapter**
- `src/lib/payments/provider.ts` interface (`createOrder`, `verify`, `refund`).
- Implementations: Razorpay (current), Stripe, PayPal stubs. Pick by `VITE_PAYMENT_PROVIDER`.

**P3.2 — Notifications adapter**
- Unified `notify({ channel, to, template, data })` over Email (Resend/SendGrid/SES), SMS (Twilio/MSG91), WhatsApp (Cloud API), Push (FCM/OneSignal). Provider chosen by env.

**P3.3 — Storage, search, analytics adapters**
- Storage: Supabase Storage / S3 / R2 behind `uploadObject()`.
- Search: Algolia / Meilisearch / Postgres FTS behind `searchProducts()`.
- Analytics: GA4 / Plausible / PostHog behind `track(event, props)`.

---

## Phase P4 — Observability & Reliability (2 batches)

**P4.1 — Error & performance telemetry**
- Wire Sentry (or PostHog) via env-gated init. Source maps uploaded in CI.
- Web Vitals already collected — pipe to chosen analytics provider.

**P4.2 — Health, uptime, SLOs**
- `/api/health` edge function with DB + cron checks.
- Status page already exists — expose via `status.<domain>`.
- Add synthetic checks (UptimeRobot / Better Stack) docs.

---

## Phase P5 — Security & Compliance (2 batches)

**P5.1 — Headers, CSP, rate limits**
- Strict CSP allowlist generated from used origins.
- Edge rate limits on auth/checkout/contact (already in DB — wire enforcement).
- Rotate Lovable API key + Razorpay webhook secret docs.

**P5.2 — Privacy & legal**
- Cookie consent banner v2 (granular categories).
- DPDP/GDPR data export & delete flows (already exist) — link from footer.
- `SECURITY.md`, `PRIVACY.md`, `TERMS.md`, `.well-known/security.txt`.

---

## Phase P6 — Performance & Launch Polish (2 batches)

**P6.1 — Performance budget**
- Route-level code splitting audit, image `loading="lazy"` + `fetchpriority`, font subsetting (DM Serif + Fira Sans already local).
- Lighthouse target ≥ 90 mobile across Home/PDP/Cart/Checkout.

**P6.2 — Launch checklist**
- DNS, SSL, custom domain on chosen host.
- Smoke test script (`scripts/smoke.ts`) hitting critical paths post-deploy.
- Runbook in `/docs/operations.md`: rollback, secrets rotation, incident response.

---

## Cross-cutting standards (every batch)

- No new hardcoded URLs or keys — env-only.
- Every new external service goes behind an adapter interface.
- Every new env var lands in `.env.example` with a one-line comment.
- Every batch ships docs in `/docs/` (deploy-vercel.md, deploy-docker.md, etc).

## Suggested order

P1 → P2 → P5 → P3 → P4 → P6
(Config + portable build + security first, then provider flexibility, then observability and final polish.)

## Next step

Reply **"start P1"** and I'll ship batches **P1.1 + P1.2** with the typed env layer, `.env.example`, and host-agnostic URL/SEO wiring.
