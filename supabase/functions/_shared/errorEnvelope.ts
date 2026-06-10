// Structured error/response envelope for edge functions.
// Goals: consistent error JSON shape, stable error codes, CORS-safe, request id correlation.
//
// Usage:
//   import { ok, fail, withEnvelope, ErrorCode } from '../_shared/errorEnvelope.ts';
//   return ok({ user });
//   return fail(ErrorCode.NOT_FOUND, 'User not found');
//
//   serve(withEnvelope(async (req, ctx) => { ... }));

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

export enum ErrorCode {
  BAD_REQUEST = 'bad_request',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMITED = 'rate_limited',
  VALIDATION = 'validation_error',
  UPSTREAM = 'upstream_error',
  INTERNAL = 'internal_error',
}

const STATUS_FOR: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.UPSTREAM]: 502,
  [ErrorCode.INTERNAL]: 500,
};

export interface EnvelopeContext {
  requestId: string;
  startedAt: number;
}

function makeRequestId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function jsonResponse(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}

export function ok<T>(data: T, init: { status?: number; headers?: Record<string, string>; requestId?: string } = {}): Response {
  return jsonResponse(
    { ok: true, data, request_id: init.requestId },
    init.status ?? 200,
    { ...(init.headers ?? {}), ...(init.requestId ? { 'X-Request-Id': init.requestId } : {}) },
  );
}

export function fail(
  code: ErrorCode,
  message: string,
  init: { status?: number; details?: unknown; headers?: Record<string, string>; requestId?: string } = {},
): Response {
  return jsonResponse(
    { ok: false, error: { code, message, details: init.details ?? null }, request_id: init.requestId },
    init.status ?? STATUS_FOR[code] ?? 500,
    { ...(init.headers ?? {}), ...(init.requestId ? { 'X-Request-Id': init.requestId } : {}) },
  );
}

export class EnvelopeError extends Error {
  code: ErrorCode;
  status?: number;
  details?: unknown;
  constructor(code: ErrorCode, message: string, opts: { status?: number; details?: unknown } = {}) {
    super(message);
    this.code = code;
    this.status = opts.status;
    this.details = opts.details;
  }
}

type Handler = (req: Request, ctx: EnvelopeContext) => Promise<Response> | Response;

/**
 * Wraps a handler with:
 *  - automatic CORS preflight
 *  - request id generation + X-Request-Id header
 *  - uniform error envelope for thrown EnvelopeError/Error
 *  - duration logging
 */
export function withEnvelope(handler: Handler): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    const ctx: EnvelopeContext = {
      requestId: req.headers.get('x-request-id') ?? makeRequestId(),
      startedAt: Date.now(),
    };
    try {
      const res = await handler(req, ctx);
      // Stamp request id if missing
      if (!res.headers.has('X-Request-Id')) {
        const headers = new Headers(res.headers);
        headers.set('X-Request-Id', ctx.requestId);
        return new Response(res.body, { status: res.status, headers });
      }
      return res;
    } catch (err) {
      const ms = Date.now() - ctx.startedAt;
      if (err instanceof EnvelopeError) {
        console.error(`[${ctx.requestId}] ${err.code} ${err.message} (${ms}ms)`, err.details ?? '');
        return fail(err.code, err.message, { status: err.status, details: err.details, requestId: ctx.requestId });
      }
      const message = err instanceof Error ? err.message : 'Internal error';
      console.error(`[${ctx.requestId}] unhandled (${ms}ms):`, err);
      return fail(ErrorCode.INTERNAL, message, { requestId: ctx.requestId });
    }
  };
}
