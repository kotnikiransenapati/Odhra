// Edge performance metrics helper.
// Records per-invocation status_code + duration_ms via `record_edge_metric` RPC.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

export async function recordEdgeMetric(
  function_name: string,
  status_code: number,
  duration_ms: number,
  error_code?: string | null,
): Promise<void> {
  try {
    await client().rpc("record_edge_metric", {
      _function_name: function_name,
      _status_code: status_code,
      _duration_ms: Math.max(0, Math.round(duration_ms)),
      _error_code: error_code ?? null,
    });
  } catch (_e) {
    // swallow — never crash callers due to telemetry
  }
}

/**
 * Wrap an edge function handler with automatic latency + status capture.
 * Use:
 *   serve(withEdgeMetrics("my-fn", async (req) => { ... return new Response(...) }))
 */
export function withEdgeMetrics(
  function_name: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const t0 = performance.now();
    let status = 500;
    let errCode: string | undefined;
    try {
      const res = await handler(req);
      status = res.status;
      if (status >= 400) errCode = `http_${status}`;
      return res;
    } catch (err) {
      errCode = (err as Error)?.name ?? "exception";
      throw err;
    } finally {
      // fire-and-forget so we never delay the response
      recordEdgeMetric(function_name, status, performance.now() - t0, errCode);
    }
  };
}
