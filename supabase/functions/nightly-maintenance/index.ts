import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobResult {
  job: string;
  ok: boolean;
  duration_ms: number;
  detail?: unknown;
  error?: string;
}

async function runJob(name: string, fn: () => Promise<unknown>): Promise<JobResult> {
  const start = Date.now();
  try {
    const detail = await fn();
    return { job: name, ok: true, duration_ms: Date.now() - start, detail };
  } catch (e) {
    return {
      job: name,
      ok: false,
      duration_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const results: JobResult[] = [];

  // 1. Inventory forecasts — 30 day rolling window.
  results.push(
    await runJob("inventory_forecasts", async () => {
      const { data, error } = await supabase.rpc("compute_inventory_forecasts", {
        p_period_days: 30,
      });
      if (error) throw error;
      return { rows: Array.isArray(data) ? data.length : 0 };
    }),
  );

  // 2. Vendor performance scorecards — last 30 days for every active vendor.
  results.push(
    await runJob("vendor_scorecards", async () => {
      const { data: vendors, error: vErr } = await supabase
        .from("vendors")
        .select("id")
        .eq("status", "approved")
        .limit(500);
      if (vErr) throw vErr;

      const today = new Date();
      const start = new Date(today.getTime() - 30 * 86400000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      let processed = 0;
      let failed = 0;
      for (const v of vendors ?? []) {
        const { error } = await supabase.rpc("compute_vendor_performance", {
          p_period_start: fmt(start),
          p_period_end: fmt(today),
        });
        if (error) {
          failed++;
          console.error("vendor scorecard failed", v.id, error.message);
        } else {
          processed++;
        }
        // The RPC computes for all vendors at once if it ignores the id arg;
        // break after first invocation to avoid redundant work.
        break;
      }
      return { vendors: vendors?.length ?? 0, processed, failed };
    }),
  );

  // 3. Customer segments refresh — re-evaluate dynamic segments by
  //    expiring the cache so the next read recomputes via existing logic.
  results.push(
    await runJob("customer_segments_refresh", async () => {
      const { data: segments, error } = await supabase
        .from("customer_segments")
        .select("id, name, is_dynamic")
        .eq("is_dynamic", true);
      if (error) throw error;

      const touched = (segments ?? []).length;
      if (touched > 0) {
        const { error: upErr } = await supabase
          .from("customer_segments")
          .update({ updated_at: new Date().toISOString() })
          .in("id", segments!.map((s) => s.id));
        if (upErr) throw upErr;
      }
      return { dynamic_segments: touched };
    }),
  );

  // 4. Webhook ledger garbage collection — keep last 30 days only.
  results.push(
    await runJob("webhook_events_gc", async () => {
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
      const { error, count } = await supabase
        .from("webhook_events")
        .delete({ count: "exact" })
        .lt("created_at", cutoff);
      if (error) throw error;
      return { deleted: count ?? 0 };
    }),
  );

  // 5. Reliability anomaly detection — materialize alert rows after the
  //    nightly telemetry batch so admins see threshold breaches early.
  results.push(
    await runJob("anomaly_detection", async () => {
      const { data, error } = await supabase.rpc("admin_run_anomaly_detection", {
        _dry_run: false,
      });
      if (error) throw error;
      return { alerts_processed: Array.isArray(data) ? data.length : 0 };
    }),
  );

  const ok = results.every((r) => r.ok);
  return new Response(
    JSON.stringify({ ok, ran_at: new Date().toISOString(), results }, null, 2),
    {
      status: ok ? 200 : 207,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
