import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Timeout helper — never let a slow dependency hold the whole probe
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

async function pingRazorpay(): Promise<{ ok: boolean; detail?: string }> {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return { ok: false, detail: "secret missing" };
  try {
    const res = await withTimeout(
      fetch("https://api.razorpay.com/v1/payments?count=1", {
        headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
      }),
      3000,
      "razorpay"
    );
    return { ok: res.status < 500, detail: res.status === 200 ? undefined : `http ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "error" };
  }
}

async function pingResend(): Promise<{ ok: boolean; detail?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, detail: "secret missing" };
  try {
    const res = await withTimeout(
      fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
      }),
      3000,
      "resend"
    );
    return { ok: res.status < 500, detail: res.status === 200 ? undefined : `http ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "error" };
  }
}

async function pingAlgolia(): Promise<{ ok: boolean; detail?: string }> {
  const appId = Deno.env.get("ALGOLIA_APP_ID");
  const apiKey = Deno.env.get("ALGOLIA_ADMIN_API_KEY") ?? Deno.env.get("ALGOLIA_API_KEY");
  if (!appId || !apiKey) return { ok: false, detail: "secret missing" };
  try {
    const res = await withTimeout(
      fetch(`https://${appId}-dsn.algolia.net/1/isalive`, {
        headers: { "X-Algolia-Application-Id": appId, "X-Algolia-API-Key": apiKey },
      }),
      3000,
      "algolia"
    );
    return { ok: res.status < 500, detail: res.status === 200 ? undefined : `http ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const started = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const [dbCheck, storageCheck, authCheck, razorpayCheck, resendCheck, algoliaCheck] =
      await Promise.allSettled([
        withTimeout(
          supabase.from("products").select("id", { count: "exact", head: true }),
          3000,
          "db"
        ),
        withTimeout(
          supabase.storage.from("product-images").list("", { limit: 1 }),
          3000,
          "storage"
        ),
        withTimeout(supabase.auth.getSession(), 3000, "auth"),
        pingRazorpay(),
        pingResend(),
        pingAlgolia(),
      ]);

    const dbOk = dbCheck.status === "fulfilled" && !(dbCheck.value as any).error;
    const dbCount = dbCheck.status === "fulfilled" ? (dbCheck.value as any).count : null;
    const storageOk = storageCheck.status === "fulfilled" && !(storageCheck.value as any).error;
    const authOk = authCheck.status === "fulfilled";
    const razorpay = razorpayCheck.status === "fulfilled" ? razorpayCheck.value : { ok: false, detail: "rejected" };
    const resend = resendCheck.status === "fulfilled" ? resendCheck.value : { ok: false, detail: "rejected" };
    const algolia = algoliaCheck.status === "fulfilled" ? algoliaCheck.value : { ok: false, detail: "rejected" };

    // Lovable AI key is presence-only (no cheap ping endpoint)
    const lovableAiOk = !!Deno.env.get("LOVABLE_API_KEY");

    const allHealthy = dbOk && storageOk && authOk && razorpay.ok && resend.ok;
    const latency = Date.now() - started;
    const memInfo = Deno.memoryUsage?.() || ({} as any);

    const status = {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      uptime_seconds: Math.floor(performance.now() / 1000),
      checks: {
        database: {
          status: dbOk ? "ok" : "error",
          product_count: dbCount,
          detail:
            dbCheck.status === "fulfilled"
              ? (dbCheck.value as any).error?.message
              : (dbCheck as PromiseRejectedResult).reason?.message ?? "timeout",
        },
        storage: {
          status: storageOk ? "ok" : "error",
          detail:
            storageCheck.status === "fulfilled"
              ? (storageCheck.value as any).error?.message
              : (storageCheck as PromiseRejectedResult).reason?.message ?? "timeout",
        },
        auth: { status: authOk ? "ok" : "error" },
        razorpay: { status: razorpay.ok ? "ok" : "error", detail: razorpay.detail },
        resend: { status: resend.ok ? "ok" : "error", detail: resend.detail },
        algolia: { status: algolia.ok ? "ok" : "error", detail: algolia.detail },
        lovable_ai: { status: lovableAiOk ? "ok" : "error" },
      },
      memory: {
        rss_mb: Math.round(((memInfo.rss || 0) / 1048576) * 100) / 100,
        heap_used_mb: Math.round(((memInfo.heapUsed || 0) / 1048576) * 100) / 100,
        heap_total_mb: Math.round(((memInfo.heapTotal || 0) / 1048576) * 100) / 100,
      },
      version: "2.1.0",
    };

    return new Response(JSON.stringify(status), {
      status: allHealthy ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "error",
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - started,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
