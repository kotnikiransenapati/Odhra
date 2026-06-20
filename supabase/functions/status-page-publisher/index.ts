// Q6: Status Page Publisher — public, unauthenticated read of system status.
// GET /status-page-publisher → { overall, components[], incidents[], uptime_30d }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [{ data: probes }, { data: incs }, { data: probeRuns }] = await Promise.all([
    supa.from("service_health_probes").select("id,service_name,is_active,consecutive_failures,last_latency_ms,last_status,last_run_at"),
    supa.from("incidents")
      .select("id,title,severity,status,is_public,public_summary,started_at,resolved_at")
      .eq("is_public", true).order("started_at", { ascending: false }).limit(20),
    supa.from("service_health_probe_results")
      .select("probe_id,ok,ran_at").gte("ran_at", since30),
  ]);

  // per-service uptime over 30d
  const uptime: Record<string, { ok: number; total: number; uptime_pct: number }> = {};
  for (const r of probeRuns ?? []) {
    const key = (r as any).probe_id;
    uptime[key] ||= { ok: 0, total: 0, uptime_pct: 100 };
    uptime[key].total += 1;
    if ((r as any).ok) uptime[key].ok += 1;
  }
  for (const k of Object.keys(uptime)) {
    uptime[k].uptime_pct = uptime[k].total ? +(100 * uptime[k].ok / uptime[k].total).toFixed(3) : 100;
  }

  const components = (probes ?? []).map((p: any) => {
    const u = uptime[p.id] ?? { uptime_pct: 100, total: 0, ok: 0 };
    const status =
      !p.is_active ? "paused" :
      (p.consecutive_failures ?? 0) >= 3 ? "outage" :
      (p.consecutive_failures ?? 0) >= 1 ? "degraded" : "operational";
    return {
      id: p.id,
      name: p.service_name,
      status,
      last_latency_ms: p.last_latency_ms,
      last_status: p.last_status,
      last_run_at: p.last_run_at,
      uptime_30d_pct: u.uptime_pct,
    };
  });

  const openIncidents = (incs ?? []).filter((i: any) => i.status !== "resolved");
  const overall =
    components.some((c) => c.status === "outage") || openIncidents.some((i: any) => i.severity === "critical") ? "major_outage" :
    components.some((c) => c.status === "degraded") || openIncidents.length ? "degraded" :
    "all_systems_operational";

  const body = {
    generated_at: new Date().toISOString(),
    overall,
    components,
    incidents: incs ?? [],
    open_incident_count: openIncidents.length,
  };

  return new Response(JSON.stringify(body), {
    headers: {
      ...cors,
      "content-type": "application/json",
      "cache-control": "public, max-age=30, s-maxage=30",
    },
  });
});
