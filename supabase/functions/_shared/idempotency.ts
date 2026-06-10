// Idempotent mutation envelope for edge functions.
//
// Usage:
//   const result = await withIdempotency({
//     scope: 'create-cod-order',
//     req,
//     userId,
//     body, // parsed JSON used to compute request hash
//     supabase: admin,
//     handler: async () => { ... ; return { data, status: 200 }; },
//   });
//   return result; // already a Response
//
// Contract:
//  - Caller provides `Idempotency-Key` header (or x-idempotency-key).
//  - If missing, handler runs without idempotency (returns wrapped Response).
//  - On replay with same key + same body hash -> cached response is returned.
//  - On replay with same key + different body hash -> 409 conflict.
//  - On concurrent in-flight request -> 409 conflict (caller should retry).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { ok, fail, ErrorCode } from './errorEnvelope.ts';

export interface IdempotencyOptions<T> {
  scope: string;
  req: Request;
  userId: string | null;
  body: unknown;
  supabase: SupabaseClient;
  handler: () => Promise<{ data: T; status?: number }>;
  requestId?: string;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value as object).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

export async function withIdempotency<T>(opts: IdempotencyOptions<T>): Promise<Response> {
  const key = opts.req.headers.get('Idempotency-Key') ?? opts.req.headers.get('x-idempotency-key');

  // No key → execute without ledger (caller opted out)
  if (!key) {
    const res = await opts.handler();
    return ok(res.data, { status: res.status ?? 200, requestId: opts.requestId });
  }

  const hash = await sha256Hex(canonicalize(opts.body ?? null));

  const { data: claimRows, error: claimErr } = await opts.supabase.rpc('claim_mutation_key', {
    _scope: opts.scope,
    _key: key,
    _user_id: opts.userId,
    _request_hash: hash,
  });

  if (claimErr) {
    if ((claimErr.message ?? '').includes('idempotency_key_conflict')) {
      return fail(ErrorCode.CONFLICT, 'Idempotency-Key reused with a different request body', {
        requestId: opts.requestId,
      });
    }
    return fail(ErrorCode.INTERNAL, 'idempotency ledger error', {
      details: claimErr.message,
      requestId: opts.requestId,
    });
  }

  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  if (claim && !claim.claimed) {
    if (claim.status === 'pending') {
      return fail(ErrorCode.CONFLICT, 'Request with this Idempotency-Key is still processing', {
        requestId: opts.requestId,
      });
    }
    // Replay cached response (completed or failed)
    return new Response(JSON.stringify(claim.cached ?? { ok: claim.status === 'completed' }), {
      status: claim.http_status ?? (claim.status === 'completed' ? 200 : 500),
      headers: {
        'Content-Type': 'application/json',
        'Idempotent-Replay': 'true',
        ...(opts.requestId ? { 'X-Request-Id': opts.requestId } : {}),
      },
    });
  }

  // We claimed it — run handler and persist result
  try {
    const res = await opts.handler();
    const body = { ok: true, data: res.data, request_id: opts.requestId };
    const status = res.status ?? 200;
    await opts.supabase.rpc('complete_mutation_key', {
      _scope: opts.scope,
      _key: key,
      _response: body,
      _http_status: status,
      _success: true,
    });
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.requestId ? { 'X-Request-Id': opts.requestId } : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const body = { ok: false, error: { code: ErrorCode.INTERNAL, message }, request_id: opts.requestId };
    await opts.supabase.rpc('complete_mutation_key', {
      _scope: opts.scope,
      _key: key,
      _response: body,
      _http_status: 500,
      _success: false,
    });
    throw err;
  }
}

/** Helper for edge handlers to short-circuit when a kill-switch is active. */
export async function assertKillSwitchInactive(supabase: SupabaseClient, key: string): Promise<void> {
  const { data, error } = await supabase.rpc('is_kill_switch_active', { _key: key });
  if (error) return; // fail open — never block traffic because of a lookup error
  if (data === true) {
    const { EnvelopeError, ErrorCode } = await import('./errorEnvelope.ts');
    throw new EnvelopeError(ErrorCode.FORBIDDEN, `Feature temporarily disabled: ${key}`, { status: 503 });
  }
}

export const _internal = { sha256Hex, canonicalize };

// Re-export for convenience.
export { createClient };
