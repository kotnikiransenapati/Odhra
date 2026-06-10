// Shared webhook idempotency helper.
// Wraps the public.claim_webhook_event RPC so each webhook delivery is
// processed exactly once across retries from external providers.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface ClaimResult {
  claimed: boolean;
  duplicate: boolean;
}

export type WebhookProvider =
  | "razorpay"
  | "shiprocket"
  | "delhivery"
  | "indiapost"
  | "stripe"
  | string;

/**
 * Atomically register a webhook delivery. Returns `claimed: true` on the
 * first delivery for a (provider, event_id) pair, and `claimed: false`
 * (with `duplicate: true`) on subsequent retries.
 */
export async function claimWebhookEvent(
  supabase: SupabaseClient,
  provider: WebhookProvider,
  eventId: string,
  eventType: string | null,
  payload: unknown,
): Promise<ClaimResult> {
  if (!eventId) {
    // No stable id from provider — fall back to time-bucketed UUID so we don't
    // mistakenly drop unique events, but still record them.
    eventId = `nokey:${crypto.randomUUID()}`;
  }

  const { data, error } = await supabase.rpc("claim_webhook_event", {
    _provider: provider,
    _event_id: eventId,
    _event_type: eventType,
    _payload: payload ?? {},
  });

  if (error) {
    console.error("claimWebhookEvent failed", provider, eventId, error);
    // Fail-open: process the event so we don't lose data, but log loudly.
    return { claimed: true, duplicate: false };
  }

  const claimed = Boolean(data);
  return { claimed, duplicate: !claimed };
}

export async function markWebhookProcessed(
  supabase: SupabaseClient,
  provider: WebhookProvider,
  eventId: string,
  status: "processed" | "failed" | "skipped" = "processed",
  errorMessage?: string,
): Promise<void> {
  const { error } = await supabase.rpc("mark_webhook_processed", {
    _provider: provider,
    _event_id: eventId,
    _status: status,
    _error: errorMessage ?? null,
  });
  if (error) {
    console.error("markWebhookProcessed failed", provider, eventId, error);
  }
}

/** Convenience constructor for service-role Supabase client inside webhooks. */
export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}
