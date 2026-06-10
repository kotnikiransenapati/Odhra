// Outbound API circuit breaker helper for Edge Functions.
// Wrap third-party calls so provider outages fail fast and recover safely.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { EnvelopeError, ErrorCode } from './errorEnvelope.ts';

export type CircuitBreakerService =
  | 'razorpay'
  | 'delhivery'
  | 'indiapost'
  | 'whatsapp_cloud'
  | 'email_delivery'
  | 'ai_gateway'
  | string;

interface BeforeRequestResult {
  allowed: boolean;
  state: string;
  retry_after_seconds: number;
  failure_count: number;
  opened_until: string | null;
}

export async function assertCircuitClosed(
  supabase: SupabaseClient,
  serviceKey: CircuitBreakerService,
): Promise<BeforeRequestResult | null> {
  const { data, error } = await supabase.rpc('circuit_breaker_before_request', {
    _service_key: serviceKey,
  });

  if (error) {
    console.error('circuit_breaker_before_request failed', serviceKey, error);
    return null;
  }

  const state = Array.isArray(data) ? data[0] : data;
  if (!state) return null;

  if (!state.allowed) {
    throw new EnvelopeError(
      ErrorCode.UPSTREAM,
      `${serviceKey} is temporarily unavailable`,
      {
        status: 503,
        details: {
          service: serviceKey,
          state: state.state,
          retry_after_seconds: state.retry_after_seconds,
          opened_until: state.opened_until,
        },
      },
    );
  }

  return state as BeforeRequestResult;
}

export async function recordCircuitSuccess(
  supabase: SupabaseClient,
  serviceKey: CircuitBreakerService,
): Promise<void> {
  const { error } = await supabase.rpc('circuit_breaker_record_success', {
    _service_key: serviceKey,
  });
  if (error) console.error('circuit_breaker_record_success failed', serviceKey, error);
}

export async function recordCircuitFailure(
  supabase: SupabaseClient,
  serviceKey: CircuitBreakerService,
  errorMessage: string,
): Promise<void> {
  const { error } = await supabase.rpc('circuit_breaker_record_failure', {
    _service_key: serviceKey,
    _error: errorMessage.slice(0, 500),
  });
  if (error) console.error('circuit_breaker_record_failure failed', serviceKey, error);
}

export async function withCircuitBreaker<T>(opts: {
  supabase: SupabaseClient;
  serviceKey: CircuitBreakerService;
  operation: () => Promise<T>;
}): Promise<T> {
  await assertCircuitClosed(opts.supabase, opts.serviceKey);
  try {
    const result = await opts.operation();
    await recordCircuitSuccess(opts.supabase, opts.serviceKey);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown upstream failure';
    await recordCircuitFailure(opts.supabase, opts.serviceKey, message);
    throw err;
  }
}