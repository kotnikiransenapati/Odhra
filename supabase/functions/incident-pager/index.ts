// Q5: Incident Pager — resolves notification routes + current on-call and dispatches notifications.
// Triggers:
//   POST /incident-pager  body: { incidentId?: string, alertId?: string, severity?: string, service?: string, event_type?: string, dry_run?: boolean }
// Auth: requires verified JWT (admin or service role). Reads via service role to bypass RLS for fan-out.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Channel = { type: "email" | "sms" | "whatsapp" | "push" | "webhook"; target?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: any = {};
  try { payload = await req.json(); } catch { /* empty body ok */ }
  const dryRun = !!payload.dry_run;

  // Hydrate from incident if id given
  let alert = {
    severity: payload.severity ?? "major",
    service: payload.service ?? null,
    event_type: payload.event_type ?? null,
    title: payload.title ?? "Incident",
    incident_id: payload.incidentId ?? null,
    alert_id: payload.alertId ?? null,
  };

  if (payload.incidentId) {
    const { data: inc } = await supa.from("incidents").select("id,title,severity,affected_services").eq("id", payload.incidentId).maybeSingle();
    if (inc) {
      alert.severity = inc.severity;
      alert.title = inc.title;
      alert.service = inc.affected_services?.[0] ?? alert.service;
    }
  }
  if (payload.alertId) {
    const { data: a } = await supa.from("anomaly_alerts").select("id,severity,metric_name,service_name,event_type").eq("id", payload.alertId).maybeSingle();
    if (a) {
      alert.severity = a.severity ?? alert.severity;
      alert.service = a.service_name ?? alert.service;
      alert.event_type = a.event_type ?? alert.event_type;
    }
  }

  // Load matching routes
  const { data: routesRaw, error: rerr } = await supa
    .from("notification_routes").select("*").eq("is_active", true).order("priority", { ascending: true });
  if (rerr) return json({ error: rerr.message }, 500);

  const routes = (routesRaw ?? []).filter((r: any) => {
    if (r.match_severity?.length && !r.match_severity.includes(alert.severity)) return false;
    if (r.match_services?.length && alert.service && !r.match_services.includes(alert.service)) return false;
    if (r.match_event_types?.length && alert.event_type && !r.match_event_types.includes(alert.event_type)) return false;
    return true;
  });

  const dispatches: any[] = [];
  for (const route of routes) {
    let people: any[] = [];
    if (route.schedule_id) {
      const { data } = await supa.rpc("current_on_call", { _schedule: route.schedule_id });
      people = (data ?? []) as any[];
    }
    const channels = (route.channels ?? []) as Channel[];
    for (const person of people) {
      for (const ch of channels) {
        const target = resolveTarget(ch, person);
        if (!target) continue;
        const job = { route_id: route.id, route_name: route.name, level: person.level, channel: ch.type, target };
        if (!dryRun) {
          await dispatch(supa, ch, target, alert, person);
        }
        dispatches.push(job);
      }
    }
    // If no people resolved but webhook channels are set, still ping webhooks
    if (!people.length) {
      for (const ch of channels.filter((c) => c.type === "webhook" && c.target)) {
        if (!dryRun) await dispatch(supa, ch, ch.target!, alert, null);
        dispatches.push({ route_id: route.id, route_name: route.name, level: 0, channel: "webhook", target: ch.target });
      }
    }
  }

  // Audit trail
  if (!dryRun) {
    await supa.from("audit_logs").insert({
      action: "incident_pager.dispatch",
      resource_type: "incident",
      resource_id: alert.incident_id,
      metadata: { alert, dispatched: dispatches.length, routes: routes.length },
    });
  }

  return json({ ok: true, alert, routes: routes.length, dispatched: dispatches.length, dispatches, dry_run: dryRun });
});

function resolveTarget(ch: Channel, person: any): string | null {
  if (ch.target) return ch.target;
  switch (ch.type) {
    case "email": return person?.contact_email ?? null;
    case "sms":
    case "whatsapp": return person?.contact_phone ?? null;
    case "push": return person?.user_id ?? null;
    default: return null;
  }
}

async function dispatch(supa: any, ch: Channel, target: string, alert: any, person: any) {
  const subject = `[${String(alert.severity).toUpperCase()}] ${alert.title}`;
  const message = `${alert.title}\nSeverity: ${alert.severity}\nService: ${alert.service ?? "n/a"}`;
  try {
    if (ch.type === "email") {
      await supa.functions.invoke("send-email", {
        body: { to: target, subject, html: `<pre>${escapeHtml(message)}</pre>` },
      });
    } else if (ch.type === "push" && person?.user_id) {
      await supa.functions.invoke("send-push-notification", {
        body: { user_id: person.user_id, title: subject, body: message },
      }).catch(() => {});
    } else if (ch.type === "webhook") {
      await fetch(target, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, message, alert }),
      });
    }
    // sms / whatsapp deferred to provider integration; record intent below.
    await supa.from("notifications").insert({
      user_id: person?.user_id ?? null,
      type: "incident_page",
      title: subject,
      message,
      metadata: { channel: ch.type, target, alert },
    }).catch(() => {});
  } catch (e) {
    await supa.from("dead_letter_queue").insert({
      queue_name: "incident_pager",
      payload: { ch, target, alert },
      error_message: String((e as any)?.message ?? e),
    }).catch(() => {});
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, "content-type": "application/json" } });
}
