/**
 * N2: SLA Breach Detector + Escalation Pipeline
 * ---------------------------------------------
 * Evaluates active orders + support tickets against configured SLA policies
 * and writes `order_sla_breaches` rows, optionally raising notifications.
 *
 * SLA targets are read from `sla_policies` (per scope: order/ticket/dispute)
 * with stage-level deadlines (e.g. orders: confirm 2h, pack 24h, ship 48h).
 */
import { supabase } from "@/integrations/supabase/client";

export type SlaPolicy = {
  id: string; scope: "order" | "ticket" | "dispute" | string;
  stage: string; deadline_minutes: number; priority?: string | null; is_active: boolean;
};

export type Breach = {
  policy_id: string;
  scope: string;
  ref_id: string;
  stage: string;
  deadline_at: string;
  breached_by_minutes: number;
  severity: "warning" | "minor" | "major" | "critical";
};

const severityFor = (overshootMin: number, target: number): Breach["severity"] => {
  const pct = overshootMin / Math.max(1, target);
  if (pct >= 1.5)  return "critical";
  if (pct >= 0.5)  return "major";
  if (pct >= 0.1)  return "minor";
  return "warning";
};

export async function loadPolicies(scope?: string): Promise<SlaPolicy[]> {
  let q = supabase.from("sla_policies").select("*").eq("is_active", true);
  if (scope) q = q.eq("scope", scope);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as SlaPolicy[];
}

/** Evaluate order-stage SLAs based on order timestamps. */
export async function detectOrderBreaches(now = Date.now()): Promise<Breach[]> {
  const policies = await loadPolicies("order");
  if (!policies.length) return [];

  const stages = [...new Set(policies.map(p => p.stage))];
  const { data: orders } = await supabase
    .from("orders")
    .select("id,status,created_at,confirmed_at,packed_at,shipped_at,delivered_at")
    .in("status", ["pending","confirmed","processing","packed","shipped"]);

  const breaches: Breach[] = [];
  for (const o of (orders ?? []) as any[]) {
    for (const p of policies) {
      const anchor = anchorForStage(o, p.stage);
      if (!anchor.start) continue;
      if (anchor.done)  continue;
      const deadline = +new Date(anchor.start) + p.deadline_minutes * 60_000;
      if (now > deadline) {
        const overshoot = Math.round((now - deadline) / 60_000);
        breaches.push({
          policy_id: p.id, scope: "order", ref_id: o.id, stage: p.stage,
          deadline_at: new Date(deadline).toISOString(),
          breached_by_minutes: overshoot,
          severity: severityFor(overshoot, p.deadline_minutes),
        });
      }
    }
    void stages;
  }
  return breaches;
}

function anchorForStage(order: any, stage: string): { start?: string; done?: string } {
  switch (stage) {
    case "confirm": return { start: order.created_at,   done: order.confirmed_at };
    case "pack":    return { start: order.confirmed_at ?? order.created_at, done: order.packed_at };
    case "ship":    return { start: order.packed_at ?? order.confirmed_at ?? order.created_at, done: order.shipped_at };
    case "deliver": return { start: order.shipped_at,  done: order.delivered_at };
    default:        return { start: order.created_at,  done: order.delivered_at };
  }
}

/** Persist breaches; idempotent on (policy_id, ref_id, stage). */
export async function persistBreaches(breaches: Breach[]) {
  if (!breaches.length) return { written: 0 };
  const rows = breaches.map(b => ({
    sla_policy_id: b.policy_id,
    order_id: b.scope === "order" ? b.ref_id : null,
    stage: b.stage,
    deadline_at: b.deadline_at,
    breached_by_minutes: b.breached_by_minutes,
    severity: b.severity,
    detected_at: new Date().toISOString(),
    status: "open",
  }));
  const { error, count } = await (supabase.from("order_sla_breaches") as any)
    .upsert(rows, { onConflict: "sla_policy_id,order_id,stage", count: "exact" });
  if (error) throw error;
  return { written: count ?? rows.length };
}

/** Trigger escalation: notify admin + vendor when severity ≥ major. */
export async function escalate(breach: Breach, recipients: { user_ids: string[] }) {
  if (breach.severity === "warning" || breach.severity === "minor") return;
  const rows = recipients.user_ids.map(uid => ({
    user_id: uid,
    type: "sla_breach",
    title: `SLA breach: ${breach.scope} ${breach.stage}`,
    message: `Overdue by ${breach.breached_by_minutes} min (${breach.severity})`,
    metadata: { breach } as never,
    is_read: false,
  }));
  await (supabase.from("notifications") as any).insert(rows);
}

/** End-to-end: detect → persist → escalate critical/major. */
export async function runSlaSweep(adminUserIds: string[]) {
  const breaches = await detectOrderBreaches();
  await persistBreaches(breaches);
  for (const b of breaches) {
    if (b.severity === "critical" || b.severity === "major") {
      await escalate(b, { user_ids: adminUserIds });
    }
  }
  return { total: breaches.length, critical: breaches.filter(b => b.severity === "critical").length };
}
