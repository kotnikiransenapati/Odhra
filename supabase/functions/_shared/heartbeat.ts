// Shared heartbeat helper for edge functions / cron tasks.
// Posts a one-line liveness record via the `record_heartbeat` RPC using the service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type HeartbeatStatus = "healthy" | "degraded" | "down" | "unknown";
export type ServiceKind =
  | "edge_function"
  | "cron"
  | "external_api"
  | "database"
  | "queue"
  | "custom";

let _client: ReturnType<typeof createClient> | null = null;
function client() {
  if (_client) return _client;
  _client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  return _client;
}

export async function recordHeartbeat(opts: {
  service_name: string;
  service_kind: ServiceKind;
  status: HeartbeatStatus;
  latency_ms?: number;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await client().rpc("record_heartbeat", {
      _service_name: opts.service_name,
      _service_kind: opts.service_kind,
      _status: opts.status,
      _latency_ms: opts.latency_ms ?? null,
      _detail: (opts.detail ?? {}) as never,
    });
  } catch (_e) {
    // never let observability crash callers
  }
}

/** Wrap an async unit of work and emit a heartbeat with measured latency. */
export async function withHeartbeat<T>(
  service_name: string,
  service_kind: ServiceKind,
  fn: () => Promise<T>,
  detail: Record<string, unknown> = {},
): Promise<T> {
  const t0 = performance.now();
  try {
    const out = await fn();
    await recordHeartbeat({
      service_name,
      service_kind,
      status: "healthy",
      latency_ms: Math.round(performance.now() - t0),
      detail,
    });
    return out;
  } catch (err) {
    await recordHeartbeat({
      service_name,
      service_kind,
      status: "down",
      latency_ms: Math.round(performance.now() - t0),
      detail: { ...detail, error: (err as Error)?.message ?? String(err) },
    });
    throw err;
  }
}
