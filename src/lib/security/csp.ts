/**
 * Content Security Policy builder.
 *
 * Centralises the CSP directives used by the app so hosting configs
 * (vercel.json, _headers, nginx.conf, staticwebapp.config.json) can stay
 * in sync. Update sources here and regenerate the platform configs.
 */

import { env } from "@/lib/env";

type Directives = Record<string, string[]>;

const SUPABASE_HOST = (() => {
  try {
    return new URL(env.VITE_SUPABASE_URL).host;
  } catch {
    return "*.supabase.co";
  }
})();

const SUPABASE_WS = `wss://${SUPABASE_HOST}`;
const SUPABASE_HTTPS = `https://${SUPABASE_HOST}`;

const BASE: Directives = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'self'"],
  "object-src": ["'none'"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https:",
  ],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "script-src": [
    "'self'",
    "'wasm-unsafe-eval'",
    "https://checkout.razorpay.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://www.google.com/recaptcha/",
    "https://www.gstatic.com/recaptcha/",
  ],
  "connect-src": [
    "'self'",
    SUPABASE_HTTPS,
    SUPABASE_WS,
    "https://www.google-analytics.com",
    "https://api.razorpay.com",
  ],
  "frame-src": [
    "'self'",
    "https://checkout.razorpay.com",
    "https://api.razorpay.com",
    "https://www.google.com/recaptcha/",
  ],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "upgrade-insecure-requests": [],
};

export function buildCsp(extra: Partial<Directives> = {}): string {
  const merged: Directives = { ...BASE };
  for (const [k, v] of Object.entries(extra)) {
    merged[k] = Array.from(new Set([...(merged[k] ?? []), ...v]));
  }
  return Object.entries(merged)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

export const DEFAULT_CSP = buildCsp();
