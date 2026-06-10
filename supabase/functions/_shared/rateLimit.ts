// Centralized rate limit helper backed by public.claim_rate_limit RPC
// Usage:
//   const rl = await checkRateLimit(supabaseAdmin, { identifier: ip, endpoint: 'login', max: 10, windowSeconds: 60 });
//   if (!rl.allowed) return new Response(...429...);
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface RateLimitOptions {
  identifier: string;
  identifierType?: 'ip' | 'user' | 'apikey' | string;
  endpoint: string;
  max: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  admin: SupabaseClient,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const { data, error } = await admin.rpc('claim_rate_limit', {
    _identifier: opts.identifier,
    _identifier_type: opts.identifierType ?? 'ip',
    _endpoint: opts.endpoint,
    _max_requests: opts.max,
    _window_seconds: opts.windowSeconds,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    // Fail-open with logging — never let limiter outage block traffic
    console.error('[rateLimit] RPC failed, allowing request:', error);
    return { allowed: true, remaining: opts.max, resetAt: new Date().toISOString(), retryAfterSeconds: 0 };
  }

  const row = data[0] as { allowed: boolean; remaining: number; reset_at: string };
  const reset = new Date(row.reset_at);
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: row.reset_at,
    retryAfterSeconds: Math.max(0, Math.ceil((reset.getTime() - Date.now()) / 1000)),
  };
}

export function rateLimitHeaders(r: RateLimitResult, max: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(max),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': r.resetAt,
    ...(r.allowed ? {} : { 'Retry-After': String(r.retryAfterSeconds) }),
  };
}

export function extractClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
}
