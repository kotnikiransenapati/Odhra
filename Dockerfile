# ============================================================
# Odhra — multi-stage production image
# Builder: bun + vite build → static dist/
# Runtime: nginx-alpine with SPA fallback + gzip/brotli + caching
# ============================================================

FROM oven/bun:1.1-alpine AS builder
WORKDIR /app

# Install deps with lockfile for reproducible builds
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

# Copy source and build
COPY . .
# Build-time env vars are injected by the orchestrator (Fly/Render/etc.)
# via `--build-arg` -> ENV; Vite inlines them into the static bundle.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SITE_URL
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY} \
    VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID} \
    VITE_SITE_URL=${VITE_SITE_URL}

RUN bun run build

# -------- runtime --------
FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache brotli && rm -rf /var/cache/apk/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Pre-compress static assets for nginx's gzip_static / brotli_static
RUN find /usr/share/nginx/html -type f \
    \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' -o -name '*.txt' -o -name '*.xml' \) \
    -exec gzip -9 -k {} \; -exec brotli -q 11 -k {} \;

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
