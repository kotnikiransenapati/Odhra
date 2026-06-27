# Production Launch Checklist

This is the gating checklist before flipping DNS to a new environment. Every
item is either automated (✅) or has an explicit owner action.

## 1. Environment
- [ ] `.env` populated from `.env.example` for the target environment.
- [ ] `VITE_SITE_URL` matches the public domain (drives canonical URLs).
- [ ] `VITE_SENTRY_DSN` set → `installSentry()` activates automatically.
- [ ] Payment provider keys (`VITE_RAZORPAY_KEY_ID` / Stripe) verified.
- [ ] Search provider (`VITE_SEARCH_PROVIDER`) set; fallback to Postgres confirmed.

## 2. Build & Bundle
- [ ] `bun run build` succeeds with zero TS errors.
- [ ] Bundle report reviewed; no chunk > 500 KB gzip (see Vite output).
- [ ] Lighthouse run on `/` and `/shop` ≥ 90 in Performance, Accessibility, SEO.

## 3. Security
- [ ] CSP from `src/lib/security/csp.ts` is identical across `vercel.json`,
      `public/_headers`, `nginx.conf`, `staticwebapp.config.json`.
- [ ] HSTS, X-Frame-Options, Referrer-Policy all present in response headers.
- [ ] Abuse guard policies (`src/lib/security/abuseGuard.ts`) wired into auth,
      contact form, OTP, and review submission.
- [ ] Secret scan (`security.yml` workflow) clean.
- [ ] `bun audit` / `npm audit` shows no high/critical advisories.

## 4. Backend
- [ ] All public-schema tables have GRANT + RLS policies.
- [ ] Edge functions deploy cleanly; `verify_jwt` configured per function.
- [ ] Realtime publication scoped to whitelisted tables only.
- [ ] Daily backup snapshot verified within last 24h.

## 5. Observability
- [ ] `/healthz` returns `data-health-status="ok"` from each region.
- [ ] Sentry receives a synthetic test event from `captureMessage("launch-smoke")`.
- [ ] Performance budget warnings monitored for 24h pre-launch.
- [ ] Uptime monitor configured against `/healthz` (1 min interval).

## 6. Commerce
- [ ] Razorpay test → live key swap rehearsed.
- [ ] One end-to-end paid order on staging produces invoice + email + ledger entry.
- [ ] Refund + dispute flows tested.
- [ ] Free shipping threshold and COD fee match merchant policy.

## 7. Content & SEO
- [ ] `sitemap.xml` + `robots.txt` reference the live domain.
- [ ] JSON-LD validates for product, breadcrumb, organization.
- [ ] Open Graph + Twitter cards render in the share debugger.

## 8. Hosting cutover
- [ ] DNS TTL pre-lowered ≥ 24h ahead of cutover.
- [ ] SSL certificate provisioned on target host.
- [ ] CDN cache purged after DNS flip.
- [ ] Old host kept warm for 48h for rollback.
