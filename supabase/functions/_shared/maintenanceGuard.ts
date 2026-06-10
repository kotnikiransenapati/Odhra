// Edge function guard: returns a 503 envelope when maintenance is active.
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

export async function isMaintenanceActive(service = "global"): Promise<boolean> {
  try {
    const { data } = await client().rpc("is_maintenance_active", { _service: service });
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Wrap an edge handler. Returns 503 JSON envelope when maintenance window is active.
 * Cached for `ttl_ms` to avoid hitting the DB per request.
 */
export function withMaintenanceGuard(
  service: string,
  handler: (req: Request) => Promise<Response>,
  ttl_ms = 15_000,
): (req: Request) => Promise<Response> {
  let cached = { value: false, at: 0 };
  return async (req: Request) => {
    if (req.method === "OPTIONS") return handler(req);
    const now = Date.now();
    if (now - cached.at > ttl_ms) {
      cached = { value: await isMaintenanceActive(service), at: now };
    }
    if (cached.value) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: "MAINTENANCE", message: "Service temporarily unavailable for maintenance." },
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }
    return handler(req);
  };
}
