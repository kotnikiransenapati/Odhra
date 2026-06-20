/**
 * Q4: On-call resolution & notification routing.
 * Pure client helpers; edge functions can use the same RPCs server-side.
 */
import { supabase } from "@/integrations/supabase/client";

export type RouteChannel =
  | { type: "email"; target?: string }
  | { type: "sms"; target?: string }
  | { type: "whatsapp"; target?: string }
  | { type: "push"; target?: string }
  | { type: "webhook"; target: string };

export type NotificationRoute = {
  id: string; name: string;
  match_severity: string[]; match_services: string[]; match_event_types: string[];
  schedule_id: string | null;
  channels: RouteChannel[];
  escalate_after_minutes: number;
  is_active: boolean; priority: number;
};

export type OnCallPerson = {
  user_id: string; user_name: string | null;
  contact_email: string | null; contact_phone: string | null;
  level: number;
};

/** Resolve the currently on-call roster (sorted primary → escalation). */
export async function getCurrentOnCall(scheduleId: string): Promise<OnCallPerson[]> {
  const { data, error } = await (supabase.rpc as any)("current_on_call", { _schedule: scheduleId });
  if (error) throw error;
  return (data ?? []) as OnCallPerson[];
}

/** Pick the routes whose matchers fit the incoming alert. */
export function selectRoutes(routes: NotificationRoute[], alert: {
  severity: string; service?: string | null; event_type?: string | null;
}): NotificationRoute[] {
  const hits = routes.filter((r) => {
    if (!r.is_active) return false;
    if (r.match_severity.length && !r.match_severity.includes(alert.severity)) return false;
    if (r.match_services.length && alert.service && !r.match_services.includes(alert.service)) return false;
    if (r.match_event_types.length && alert.event_type && !r.match_event_types.includes(alert.event_type)) return false;
    return true;
  });
  return hits.sort((a, b) => a.priority - b.priority);
}

/** Materialize notification recipients for an alert: routes × on-call roster × channels. */
export async function resolveNotificationTargets(alert: {
  severity: string; service?: string | null; event_type?: string | null;
}): Promise<Array<{ route: NotificationRoute; people: OnCallPerson[] }>> {
  const { data: routesRaw, error } = await (supabase
    .from("notification_routes") as any)
    .select("*").eq("is_active", true).order("priority", { ascending: true });
  if (error) throw error;
  const routes = selectRoutes((routesRaw ?? []) as NotificationRoute[], alert);
  const out: Array<{ route: NotificationRoute; people: OnCallPerson[] }> = [];
  for (const route of routes) {
    const people = route.schedule_id ? await getCurrentOnCall(route.schedule_id) : [];
    out.push({ route, people });
  }
  return out;
}
