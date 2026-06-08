// Shared rate limiter for edge functions.
// Uses the public.check_rate_limit RPC when available; falls back to in-memory.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Bucket = { count: number; resetAt: number };
const mem = new Map<string, Bucket>();

export function getClientKey(req: Request, userId: string | null, prefix: string): string {
  if (userId) return `${prefix}:u:${userId}`;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${prefix}:ip:${ip}`;
}

/**
 * Returns true when the action is allowed; false when rate-limited.
 * Tries the public.check_rate_limit RPC first; on any error falls back to a
 * process-local in-memory bucket so the function still degrades safely.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
  supabase?: SupabaseClient,
): Promise<boolean> {
  const client =
    supabase ??
    createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

  try {
    const { data, error } = await client.rpc("check_rate_limit", {
      p_identifier: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });
    if (!error && typeof data === "boolean") return data;
  } catch (_err) {
    // fall through to in-memory
  }

  const now = Date.now();
  const entry = mem.get(key);
  if (!entry || now > entry.resetAt) {
    mem.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export function rateLimitResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again shortly." }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
