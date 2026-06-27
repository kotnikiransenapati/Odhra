/**
 * Client-side health probe.
 *
 * Hosting platforms (Render, Fly, K8s) expect a `/healthz` endpoint. Since
 * this app is a static SPA, we expose the probe via a route component that
 * actively pings Supabase + verifies env wiring and returns a JSON-shaped
 * payload in the DOM. Uptime checkers can scrape the `application/json` block.
 */
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/lib/env";

export interface HealthReport {
  status: "ok" | "degraded" | "down";
  generatedAt: string;
  checks: Record<string, { ok: boolean; durationMs: number; detail?: string }>;
  version: string;
  env: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ ok: boolean; durationMs: number; detail?: string }> {
  const start = performance.now();
  try {
    await fn();
    return { ok: true, durationMs: Math.round(performance.now() - start) };
  } catch (err: any) {
    return {
      ok: false,
      durationMs: Math.round(performance.now() - start),
      detail: err?.message ?? String(err),
    };
  }
}

export async function runHealthChecks(): Promise<HealthReport> {
  const checks: HealthReport["checks"] = {};

  checks.env = await timed(async () => {
    if (!env.VITE_SUPABASE_URL) throw new Error("Supabase URL missing");
    if (!env.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error("Supabase key missing");
  });

  checks.database = await timed(async () => {
    const { error } = await supabase.from("system_settings").select("key").limit(1);
    if (error) throw error;
  });

  checks.auth = await timed(async () => {
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
  });

  const allOk = Object.values(checks).every((c) => c.ok);
  const anyOk = Object.values(checks).some((c) => c.ok);

  return {
    status: allOk ? "ok" : anyOk ? "degraded" : "down",
    generatedAt: new Date().toISOString(),
    checks,
    version: (import.meta.env.VITE_APP_VERSION as string) ?? "dev",
    env: import.meta.env.MODE,
  };
}
