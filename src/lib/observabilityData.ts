/**
 * O1: Admin Observability Dashboard — Data Layer
 * ----------------------------------------------
 * One unified read-side facade that powers the admin "Health & Ops" cockpit.
 * Aggregates KPIs from existing tables so the UI never composes ad-hoc queries.
 *
 * Sections:
 *   • Commerce KPIs   — GMV, AOV, orders, refund rate, conversion proxy
 *   • Funnel          — view → cart → checkout → paid (last N days)
 *   • Ops Health      — SLA breaches, DLQ depth, circuit-breaker state, error logs
 *   • Service Probes  — recent service_health_probe_results pass/fail
 *   • Edge Functions  — call volume + p95 latency + error rate
 *   • Vendor Pulse    — top vendors by GMV, payout backlog, KYC funnel
 *
 * All queries are READ-ONLY and admin-gated by the underlying table RLS.
 * Each section returns deterministic shapes safe to feed into chart libs.
 */
import { supabase } from "@/integrations/supabase/client";

export type Range = { from: string; to: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export const defaultRange = (days = 7): Range => ({
  from: isoDaysAgo(days),
  to:   new Date().toISOString(),
});

// ────────────────────────────────────────────────────────────────
// Commerce KPIs
// ────────────────────────────────────────────────────────────────
export type CommerceKpis = {
  gmv: number;
  orders: number;
  paid_orders: number;
  refunded_orders: number;
  aov: number;
  refund_rate: number;
  cod_share: number;
};

export async function getCommerceKpis(r: Range = defaultRange()): Promise<CommerceKpis> {
  const { data } = await (supabase.from("orders") as any)
    .select("total_amount,status,payment_method,created_at")
    .gte("created_at", r.from).lte("created_at", r.to);

  const rows = (data ?? []) as Array<{ total_amount: number; status: string; payment_method: string }>;
  const orders = rows.length;
  const paid = rows.filter(o => ["paid","confirmed","processing","packed","shipped","delivered"].includes(o.status));
  const refunded = rows.filter(o => o.status === "refunded");
  const cod = rows.filter(o => (o.payment_method ?? "").toLowerCase() === "cod");
  const gmv = paid.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  return {
    gmv: round2(gmv),
    orders,
    paid_orders: paid.length,
    refunded_orders: refunded.length,
    aov: paid.length ? round2(gmv / paid.length) : 0,
    refund_rate: orders ? round2(refunded.length / orders) : 0,
    cod_share:   orders ? round2(cod.length / orders)      : 0,
  };
}

// ────────────────────────────────────────────────────────────────
// Funnel (last N days, daily buckets)
// ────────────────────────────────────────────────────────────────
export type FunnelPoint = { day: string; views: number; carts: number; checkouts: number; paid: number };

export async function getFunnel(days = 7): Promise<FunnelPoint[]> {
  const from = isoDaysAgo(days);
  const [{ data: events }, { data: carts }, { data: orders }] = await Promise.all([
    (supabase.from("user_behavior_events") as any)
      .select("event_type,created_at").gte("created_at", from).in("event_type", ["page_view","product_view"]),
    (supabase.from("cart_abandonment_events") as any)
      .select("created_at,checkout_started_at").gte("created_at", from),
    (supabase.from("orders") as any).select("status,created_at").gte("created_at", from),
  ]);

  const bucket = new Map<string, FunnelPoint>();
  const key = (iso: string) => iso.slice(0, 10);
  const bump = (k: string, f: keyof Omit<FunnelPoint,"day">) => {
    const b = bucket.get(k) ?? { day: k, views: 0, carts: 0, checkouts: 0, paid: 0 };
    (b as any)[f]++; bucket.set(k, b);
  };

  for (const e of (events ?? [])) bump(key(e.created_at), "views");
  for (const c of (carts ?? [])) {
    bump(key(c.created_at), "carts");
    if (c.checkout_started_at) bump(key(c.checkout_started_at), "checkouts");
  }
  for (const o of (orders ?? [])) if (o.status !== "pending" && o.status !== "cancelled") bump(key(o.created_at), "paid");

  return [...bucket.values()].sort((a, b) => a.day.localeCompare(b.day));
}

// ────────────────────────────────────────────────────────────────
// Ops Health
// ────────────────────────────────────────────────────────────────
export type OpsHealth = {
  open_breaches: number;
  critical_breaches: number;
  dlq_depth: number;
  open_circuit_breakers: number;
  error_logs_24h: number;
  active_incidents: number;
};

export async function getOpsHealth(): Promise<OpsHealth> {
  const since = isoDaysAgo(1);
  const [b1, b2, dlq, cb, err, inc] = await Promise.all([
    (supabase.from("order_sla_breaches") as any).select("id", { count: "exact", head: true }).eq("status", "open"),
    (supabase.from("order_sla_breaches") as any).select("id", { count: "exact", head: true }).eq("status", "open").eq("severity", "critical"),
    (supabase.from("dead_letter_queue") as any).select("id", { count: "exact", head: true }).is("resolved_at", null),
    (supabase.from("outbound_circuit_breakers") as any).select("id", { count: "exact", head: true }).eq("state", "open"),
    (supabase.from("error_logs") as any).select("id", { count: "exact", head: true }).gte("created_at", since),
    (supabase.from("incidents") as any).select("id", { count: "exact", head: true }).in("status", ["investigating","identified","monitoring"]),
  ]);
  return {
    open_breaches:     b1.count ?? 0,
    critical_breaches: b2.count ?? 0,
    dlq_depth:         dlq.count ?? 0,
    open_circuit_breakers: cb.count ?? 0,
    error_logs_24h:    err.count ?? 0,
    active_incidents:  inc.count ?? 0,
  };
}

// ────────────────────────────────────────────────────────────────
// Service probes (latest result per probe)
// ────────────────────────────────────────────────────────────────
export type ProbeStatus = { probe_id: string; name: string; healthy: boolean; latency_ms: number | null; checked_at: string };

export async function getProbeStatuses(): Promise<ProbeStatus[]> {
  const { data: probes } = await (supabase.from("service_health_probes") as any).select("id,name").eq("is_active", true);
  if (!probes?.length) return [];
  const ids = probes.map((p: any) => p.id);
  const { data: results } = await (supabase.from("service_health_probe_results") as any)
    .select("probe_id,is_healthy,latency_ms,checked_at")
    .in("probe_id", ids).order("checked_at", { ascending: false }).limit(500);
  const seen = new Set<string>();
  const out: ProbeStatus[] = [];
  for (const r of (results ?? []) as any[]) {
    if (seen.has(r.probe_id)) continue;
    seen.add(r.probe_id);
    const p = probes.find((x: any) => x.id === r.probe_id);
    out.push({ probe_id: r.probe_id, name: p?.name ?? r.probe_id, healthy: !!r.is_healthy, latency_ms: r.latency_ms, checked_at: r.checked_at });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────
// Edge function metrics (volume + p95 + error rate)
// ────────────────────────────────────────────────────────────────
export type EdgeFnMetric = { fn: string; calls: number; errors: number; p95_ms: number; error_rate: number };

function p95(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx];
}

export async function getEdgeFunctionMetrics(hours = 24): Promise<EdgeFnMetric[]> {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data } = await (supabase.from("edge_function_metrics") as any)
    .select("function_name,duration_ms,status_code,created_at").gte("created_at", since).limit(10000);
  const by = new Map<string, { calls: number; errors: number; durs: number[] }>();
  for (const r of (data ?? []) as any[]) {
    const slot = by.get(r.function_name) ?? { calls: 0, errors: 0, durs: [] };
    slot.calls++;
    if (Number(r.status_code) >= 500) slot.errors++;
    if (r.duration_ms != null) slot.durs.push(Number(r.duration_ms));
    by.set(r.function_name, slot);
  }
  return [...by.entries()].map(([fn, s]) => ({
    fn, calls: s.calls, errors: s.errors,
    p95_ms: Math.round(p95(s.durs)),
    error_rate: s.calls ? round2(s.errors / s.calls) : 0,
  })).sort((a, b) => b.calls - a.calls);
}

// ────────────────────────────────────────────────────────────────
// Vendor pulse
// ────────────────────────────────────────────────────────────────
export type VendorPulse = {
  top_by_gmv: Array<{ vendor_id: string; brand_name: string; gmv: number }>;
  payout_backlog: number;
  kyc_funnel: { pending: number; submitted: number; verified: number; rejected: number };
};

export async function getVendorPulse(r: Range = defaultRange(30)): Promise<VendorPulse> {
  const [{ data: subOrders }, { data: payouts }, { data: vendors }] = await Promise.all([
    (supabase.from("sub_orders") as any).select("vendor_id,subtotal,status,created_at").gte("created_at", r.from).lte("created_at", r.to),
    (supabase.from("payout_requests") as any).select("id,status").eq("status", "pending"),
    (supabase.from("vendors") as any).select("id,brand_name,kyc_status"),
  ]);
  const byVendor = new Map<string, number>();
  for (const s of (subOrders ?? []) as any[]) {
    if (["paid","confirmed","processing","shipped","delivered"].includes(s.status)) {
      byVendor.set(s.vendor_id, (byVendor.get(s.vendor_id) ?? 0) + Number(s.subtotal || 0));
    }
  }
  const nameById = new Map((vendors ?? []).map((v: any) => [v.id, v.brand_name]));
  const top = [...byVendor.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([vendor_id, gmv]) => ({ vendor_id, brand_name: String(nameById.get(vendor_id) ?? "—"), gmv: round2(gmv) }));

  const kycFunnel = { pending: 0, submitted: 0, verified: 0, rejected: 0 };
  for (const v of (vendors ?? []) as any[]) {
    const k = v.kyc_status as keyof typeof kycFunnel;
    if (k in kycFunnel) kycFunnel[k]++;
  }

  return {
    top_by_gmv: top,
    payout_backlog: (payouts ?? []).length,
    kyc_funnel: kycFunnel,
  };
}

// ────────────────────────────────────────────────────────────────
// One-shot snapshot
// ────────────────────────────────────────────────────────────────
export type ObservabilitySnapshot = {
  generated_at: string;
  range: Range;
  commerce: CommerceKpis;
  funnel: FunnelPoint[];
  ops: OpsHealth;
  probes: ProbeStatus[];
  edge_fns: EdgeFnMetric[];
  vendors: VendorPulse;
};

export async function getObservabilitySnapshot(days = 7): Promise<ObservabilitySnapshot> {
  const range = defaultRange(days);
  const [commerce, funnel, ops, probes, edge_fns, vendors] = await Promise.all([
    getCommerceKpis(range),
    getFunnel(days),
    getOpsHealth(),
    getProbeStatuses(),
    getEdgeFunctionMetrics(24),
    getVendorPulse(defaultRange(30)),
  ]);
  return { generated_at: new Date().toISOString(), range, commerce, funnel, ops, probes, edge_fns, vendors };
}
