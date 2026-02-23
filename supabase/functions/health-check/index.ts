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

    // 1. Database connectivity check
    const { error: dbError } = await supabase
      .from("categories")
      .select("id")
      .limit(1)
      .single();

    const dbHealthy = !dbError || dbError.code === "PGRST116"; // no rows is fine

    // 2. Edge function environment check
    const envHealthy = !!supabaseUrl && !!serviceKey;

    // 3. Storage check
    const { error: storageError } = await supabase.storage
      .from("product-images")
      .list("", { limit: 1 });
    const storageHealthy = !storageError;

    const allHealthy = dbHealthy && envHealthy && storageHealthy;
    const latency = Date.now() - started;

    const status = {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      checks: {
        database: { status: dbHealthy ? "ok" : "error", detail: dbError?.message },
        environment: { status: envHealthy ? "ok" : "error" },
        storage: { status: storageHealthy ? "ok" : "error", detail: storageError?.message },
      },
      version: "1.0.0",
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
        error: err.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
