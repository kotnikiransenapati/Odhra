# CI/CD

The repo ships three GitHub Actions workflows under `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | PR + push to `main` | Lint, typecheck, build, upload `dist` artifact |
| `deploy.yml` | Push to `main` (auto Vercel) or manual `workflow_dispatch` | Deploy to Vercel / Netlify / Cloudflare Pages / GHCR Docker |
| `security.yml` | PR, push, weekly cron | Dependency audit, CodeQL, gitleaks secret scan |

## Required GitHub Secrets

Build (always):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`

Per-target (only add what you use):
- Vercel: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Netlify: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
- Cloudflare: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PROJECT_NAME`
- Docker (GHCR): no extra secrets — uses `GITHUB_TOKEN`

## Manual deploy

Actions tab → **Deploy** → Run workflow → pick a target.

## Concurrency

Each workflow uses `concurrency.group` to cancel stale CI runs while
serialising deploys so two pushes never race the same environment.
