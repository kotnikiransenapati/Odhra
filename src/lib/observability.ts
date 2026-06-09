import { supabase } from "@/integrations/supabase/client";

/**
 * Record an edge function invocation metric. Fire-and-forget — never throws.
 * Use to instrument client-side calls to supabase.functions.invoke().
 */
export async function recordEdgeMetric(params: {
  functionName: string;
  durationMs: number;
  statusCode?: number | null;
  error?: boolean;
  errorMessage?: string | null;
  requestId?: string | null;
}) {
  try {
    await supabase.from("edge_function_metrics").insert({
      function_name: params.functionName.slice(0, 200),
      duration_ms: Math.max(0, Math.round(params.durationMs)),
      status_code: params.statusCode ?? null,
      error: !!params.error,
      error_message: params.errorMessage?.slice(0, 2000) ?? null,
      request_id: params.requestId ?? null,
    });
  } catch {
    /* swallow — observability must never break the app */
  }
}

/**
 * Wrap any async edge function invocation with timing + metric capture.
 */
export async function withMetric<T>(
  functionName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    void recordEdgeMetric({
      functionName,
      durationMs: performance.now() - start,
      error: false,
      statusCode: 200,
    });
    return result;
  } catch (err: unknown) {
    void recordEdgeMetric({
      functionName,
      durationMs: performance.now() - start,
      error: true,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
