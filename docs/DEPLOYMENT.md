# Deployment

Odhra ships as a fully static SPA + Supabase backend, so any modern host works.
Build output is `dist/` after `bun run build`.

## Required env vars (build-time)

Every host needs these injected **before** `bun run build`:

| Var | Notes |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Project ref |
| `VITE_SITE_URL` | Canonical public URL (e.g. `https://shop.example.com`) |

All other `VITE_*` variables in `.env.example` are optional and gate integrations.

---

## Vercel
1. Import the repo. Framework preset: **Other**.
2. Build command `bun run build`, output `dist`.
3. Add the env vars above in Project Settings → Environment Variables.
4. `vercel.json` already configures SPA rewrites, caching, and security headers.

## Netlify / Cloudflare Pages
1. Build command `bun run build`, publish directory `dist`.
2. `public/_redirects` (SPA fallback) and `public/_headers` (caching + security) are picked up automatically.

## Azure Static Web Apps
1. `staticwebapp.config.json` handles fallback, headers, and asset caching.

## Docker / VPS / Fly.io / Render / Cloud Run
```bash
docker build -t odhra \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
  --build-arg VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
  --build-arg VITE_SITE_URL=$VITE_SITE_URL .
docker run -p 8080:8080 odhra
```
- **Fly.io**: `fly launch --no-deploy` then `fly deploy` (see `fly.toml`).
- **Render**: connect repo, `render.yaml` is auto-detected.
- **Cloud Run / ECS / Kubernetes**: push the image to your registry; container listens on `:8080`, exposes `/healthz`.

`nginx.conf` includes SPA fallback, gzip+brotli, long-cache for hashed assets, and strict security headers. Image is health-checked at `/healthz`.

## Local prod simulation
```bash
docker compose up --build
# → http://localhost:8080
```
