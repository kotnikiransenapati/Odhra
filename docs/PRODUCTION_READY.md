# Production Readiness — Final Summary

This document closes out the Production & Portable-Hosting Upgrade plan.
It indexes every artifact created across the 12 batches so an operator can
hand the codebase to any hosting provider with confidence.

## Phase index

| Phase | Topic | Key artifacts |
| --- | --- | --- |
| P1.1 | Typed env validation | `src/lib/env.ts` |
| P1.2 | Host-agnostic URLs | `src/lib/siteUrl.ts` |
| P2.1 | Build portability | `vercel.json`, `netlify.toml`, `staticwebapp.config.json` |
| P2.2 | Container build | `Dockerfile`, `nginx.conf` |
| P2.3 | CI/CD | `.github/workflows/ci.yml`, `deploy.yml` |
| P3.1 | Payments adapter | `src/lib/payments/{index,razorpay,cod}.ts` |
| P3.2 | Search + notifications adapters | `src/lib/search/*`, `src/lib/notifications/*` |
| P4.1 | Observability | `src/lib/observability/{sentry,healthz,performanceBudget}.ts` |
| P5.1 | Security primitives | `src/lib/security/{csp,rateLimit}.ts` |
| P5.2 | Hosting CSP rollout | CSP applied in `vercel.json`, `nginx.conf`, etc. |
| P5.3 | Abuse guard | `src/lib/security/abuseGuard.ts` |
| P6.1 | Performance budget + checklist | `src/lib/observability/performanceBudget.ts`, `docs/LAUNCH_CHECKLIST.md` |
| P6.2 | Route prefetch | `src/lib/perf/routePrefetch.ts`, `src/components/perf/RoutePrefetcher.tsx` |
| P6.3 | Smoke harness + this doc | `scripts/smoke.mjs`, `docs/PRODUCTION_READY.md` |

## How to verify a deployment

1. Deploy to your target host (Vercel / Netlify / Docker / Azure SWA).
2. Run the smoke harness against the deployed URL:

   ```sh
   node scripts/smoke.mjs https://your-domain.example
   ```

   The script exits non-zero on any failed check; wire it into your
   post-deploy CI step.

3. Open `/healthz` and confirm the JSON status is `ok`.
4. Review `docs/LAUNCH_CHECKLIST.md` and tick each item.

## Switching providers

The adapter layer means a provider swap is a single-file change:

- **Payments** — add an implementation under `src/lib/payments/<name>.ts`
  matching `PaymentProvider` and register it in `src/lib/payments/index.ts`.
- **Search** — same pattern under `src/lib/search/`.
- **Notifications** — same pattern under `src/lib/notifications/`.

No call sites need to change.

## Hosting matrix

| Host | Config file | SPA fallback | Headers |
| --- | --- | --- | --- |
| Vercel | `vercel.json` | rewrites → `/index.html` | CSP, COOP, X-Content-Type-Options |
| Netlify | `netlify.toml` | `[[redirects]]` to `/index.html` | Same |
| Azure SWA | `staticwebapp.config.json` | `navigationFallback` | Same |
| Docker (Nginx) | `nginx.conf` | `try_files $uri /index.html` | Same |

All four hosts ship the same CSP and security header set generated from
`src/lib/security/csp.ts`, so behavior is identical across providers.
