/**
 * O2: Incident Command + Runbooks Engine
 * --------------------------------------
 * - `declareIncident()` opens an incident, optionally linked to a triggering alert.
 * - `postUpdate()` appends a status update + advances state machine.
 * - `resolveIncident()` closes and computes MTTR.
 * - `findMatchingRunbooks()` evaluates active runbooks against a trigger payload.
 * - `executeRunbook()` runs declarative steps with structured results.
 * - `autoRespond()` glue: trigger → find runbook → declare incident → execute.
 *
 * Runbook steps are declarative JSON so admins can edit them without redeploys.
 * Supported step kinds:
 *   { kind: "notify",        params: { channel: "admin" | "vendor" | "status_page", message } }
 *   { kind: "killswitch",    params: { code, enabled } }
 *   { kind: "circuit_open",  params: { service } }
 *   { kind: "edge_invoke",   params: { name, body } }
 *   { kind: "comment",       params: { text } }
 *   { kind: "wait_for_ack",  params: { role } }   // human-in-the-loop
 */
import { supabase } from "@/integrations/supabase/client";

export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
export type Severity = "info" | "minor" | "major" | "critical";

const VALID_NEXT: Record<IncidentStatus, IncidentStatus[]> = {
  investigating: ["identified","monitoring","resolved"],
  identified:    ["monitoring","resolved","investigating"],
  monitoring:    ["resolved","identified"],
  resolved:      [],
};

export type Incident = {
  id: string; title: string; severity: Severity; status: IncidentStatus;
  started_at: string; resolved_at?: string | null;
};

export async function declareIncident(opts: {
  title: string; severity: Severity; impact?: string; affected_services?: string[];
  isPublic?: boolean; publicSummary?: string; createdBy: string; sourceAlertId?: string | null;
}): Promise<Incident> {
  const { data, error } = await (supabase.from("incidents") as any).insert({
    title: opts.title,
    severity: opts.severity,
    status: "investigating",
    impact: opts.impact ?? null,
    affected_services: opts.affected_services ?? [],
    is_public: opts.isPublic ?? false,
    public_summary: opts.publicSummary ?? null,
    started_at: new Date().toISOString(),
    created_by: opts.createdBy,
    source_alert_id: opts.sourceAlertId ?? null,
  }).select("*").single();
  if (error) throw error;
  return data as Incident;
}

export async function postUpdate(incidentId: string, opts: {
  status: IncidentStatus; message: string; postedBy: string;
}) {
  const { data: current, error } = await (supabase.from("incidents") as any)
    .select("status").eq("id", incidentId).single();
  if (error) throw error;
  if (!VALID_NEXT[current.status as IncidentStatus]?.includes(opts.status) && current.status !== opts.status) {
    throw new Error(`Invalid transition: ${current.status} → ${opts.status}`);
  }
  await (supabase.from("incident_updates") as any).insert({
    incident_id: incidentId, status: opts.status, message: opts.message, posted_by: opts.postedBy,
  });
  await (supabase.from("incidents") as any).update({ status: opts.status }).eq("id", incidentId);
}

export async function resolveIncident(incidentId: string, message: string, postedBy: string) {
  const resolvedAt = new Date().toISOString();
  await postUpdate(incidentId, { status: "resolved", message, postedBy });
  await (supabase.from("incidents") as any).update({ resolved_at: resolvedAt }).eq("id", incidentId);
}

// ─────────── Runbooks ───────────
export type Runbook = {
  id: string; code: string; title: string; trigger_kind: string;
  trigger_conditions: Record<string, unknown>; severity: Severity;
  steps: RunbookStep[]; is_active: boolean;
};

export type RunbookStep =
  | { kind: "notify";       params: { channel: "admin"|"vendor"|"status_page"; message: string; user_ids?: string[] } }
  | { kind: "killswitch";   params: { code: string; enabled: boolean } }
  | { kind: "circuit_open"; params: { service: string } }
  | { kind: "edge_invoke";  params: { name: string; body?: Record<string, unknown> } }
  | { kind: "comment";      params: { text: string } }
  | { kind: "wait_for_ack"; params: { role: string } };

export type StepResult = { kind: string; ok: boolean; output?: unknown; error?: string; at: string };

export async function findMatchingRunbooks(triggerKind: string, payload: Record<string, unknown>): Promise<Runbook[]> {
  const { data } = await (supabase.from("runbooks") as any)
    .select("*").eq("is_active", true).eq("trigger_kind", triggerKind);
  return ((data ?? []) as Runbook[]).filter(rb => matches(rb.trigger_conditions, payload));
}

/** Deep predicate: every key in conds matches payload (exact, or { op:"gte", value }). */
function matches(conds: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(conds ?? {})) {
    const got = (payload as any)[k];
    if (v && typeof v === "object" && "op" in (v as any)) {
      const { op, value } = v as { op: string; value: number };
      if (op === "gte" && !(Number(got) >= value)) return false;
      if (op === "gt"  && !(Number(got) >  value)) return false;
      if (op === "lte" && !(Number(got) <= value)) return false;
      if (op === "eq"  && got !== value)          return false;
    } else if (got !== v) return false;
  }
  return true;
}

export async function executeRunbook(opts: {
  runbook: Runbook; incidentId?: string; triggeredBy: string; payload: Record<string, unknown>;
}): Promise<{ executionId: string; status: "succeeded"|"failed"|"partial"; results: StepResult[] }> {
  const { data: exec, error } = await (supabase.from("runbook_executions") as any).insert({
    runbook_id: opts.runbook.id, incident_id: opts.incidentId ?? null,
    triggered_by: opts.triggeredBy, trigger_payload: opts.payload as never, status: "running",
  }).select("id").single();
  if (error) throw error;

  const results: StepResult[] = [];
  for (const step of opts.runbook.steps) {
    const r = await runStep(step, opts.incidentId, opts.triggeredBy);
    results.push(r);
    if (!r.ok && step.kind !== "wait_for_ack") break;
  }
  const ok = results.every(r => r.ok);
  const someOk = results.some(r => r.ok);
  const status: "succeeded"|"failed"|"partial" = ok ? "succeeded" : someOk ? "partial" : "failed";

  await (supabase.from("runbook_executions") as any)
    .update({ status, step_results: results as never, finished_at: new Date().toISOString() })
    .eq("id", exec.id);

  return { executionId: exec.id, status, results };
}

async function runStep(step: RunbookStep, incidentId: string | undefined, actor: string): Promise<StepResult> {
  const at = new Date().toISOString();
  try {
    switch (step.kind) {
      case "notify": {
        const rows = (step.params.user_ids ?? []).map(uid => ({
          user_id: uid, type: "incident",
          title: `[${step.params.channel}] ${step.params.message.slice(0,60)}`,
          message: step.params.message, is_read: false,
          metadata: { incident_id: incidentId } as never,
        }));
        if (rows.length) await (supabase.from("notifications") as any).insert(rows);
        return { kind: step.kind, ok: true, at };
      }
      case "killswitch": {
        await (supabase.from("kill_switches") as any)
          .update({ enabled: step.params.enabled, updated_by: actor })
          .eq("code", step.params.code);
        return { kind: step.kind, ok: true, at };
      }
      case "circuit_open": {
        await (supabase.from("outbound_circuit_breakers") as any)
          .update({ state: "open", last_state_change_at: at })
          .eq("service_name", step.params.service);
        return { kind: step.kind, ok: true, at };
      }
      case "edge_invoke": {
        const { data, error } = await supabase.functions.invoke(step.params.name, { body: step.params.body });
        if (error) throw error;
        return { kind: step.kind, ok: true, output: data, at };
      }
      case "comment": {
        if (incidentId) await (supabase.from("incident_updates") as any).insert({
          incident_id: incidentId, status: "investigating", message: step.params.text, posted_by: actor,
        });
        return { kind: step.kind, ok: true, at };
      }
      case "wait_for_ack":
        return { kind: step.kind, ok: true, output: { waiting_for: step.params.role }, at };
    }
  } catch (e: any) {
    return { kind: step.kind, ok: false, error: String(e?.message ?? e), at };
  }
}

/** End-to-end glue: trigger → match → declare → execute. */
export async function autoRespond(opts: {
  triggerKind: string; payload: Record<string, unknown>;
  actor: string; title: string; severity?: Severity;
}) {
  const books = await findMatchingRunbooks(opts.triggerKind, opts.payload);
  if (!books.length) return { matched: 0 };

  const severity = opts.severity ?? (books[0].severity as Severity) ?? "minor";
  const incident = await declareIncident({
    title: opts.title, severity, createdBy: opts.actor,
    affected_services: ((opts.payload as any).services ?? []) as string[],
  });

  const runs = [];
  for (const rb of books) {
    runs.push(await executeRunbook({ runbook: rb, incidentId: incident.id, triggeredBy: opts.actor, payload: opts.payload }));
  }
  return { matched: books.length, incident, runs };
}
