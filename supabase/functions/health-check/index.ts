import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const started = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Run all checks in parallel
    const [dbCheck, storageCheck, authCheck, edgeFnCheck] = await Promise.allSettled([
      // 1. Database connectivity + row count
      supabase.from("products").select("id", { count: "exact", head: true }),
      // 2. Storage bucket access
      supabase.storage.from("product-images").list("", { limit: 1 }),
      // 3. Auth service health
      supabase.auth.getSession(),
      // 4. Check critical env vars
      Promise.resolve({
        lovable_api_key: !!Deno.env.get("LOVABLE_API_KEY"),
        razorpay: !!Deno.env.get("RAZORPAY_KEY_ID"),
        resend: !!Deno.env.get("RESEND_API_KEY"),
        algolia: !!Deno.env.get("ALGOLIA_APP_ID"),
      }),
    ]);

    const dbOk = dbCheck.status === "fulfilled" && !dbCheck.value.error;
    const dbCount = dbCheck.status === "fulfilled" ? dbCheck.value.count : null;
    const storageOk = storageCheck.status === "fulfilled" && !storageCheck.value.error;
    const authOk = authCheck.status === "fulfilled";
    const envStatus = edgeFnCheck.status === "fulfilled" ? edgeFnCheck.value : {};

    const allHealthy = dbOk && storageOk && authOk;
    const latency = Date.now() - started;

    // Memory usage
    const memInfo = Deno.memoryUsage?.() || {};

    const status = {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      uptime_seconds: Math.floor(performance.now() / 1000),
      checks: {
        database: {
          status: dbOk ? "ok" : "error",
          product_count: dbCount,
          detail: dbCheck.status === "fulfilled" ? dbCheck.value.error?.message : "timeout",
        },
        storage: {
          status: storageOk ? "ok" : "error",
          detail: storageCheck.status === "fulfilled" ? storageCheck.value.error?.message : "timeout",
        },
        auth: {
          status: authOk ? "ok" : "error",
        },
        integrations: envStatus,
      },
      memory: {
        rss_mb: Math.round((memInfo.rss || 0) / 1048576 * 100) / 100,
        heap_used_mb: Math.round((memInfo.heapUsed || 0) / 1048576 * 100) / 100,
        heap_total_mb: Math.round((memInfo.heapTotal || 0) / 1048576 * 100) / 100,
      },
      version: "2.0.0",
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
