/**
 * Lifecycle event logger — typed, idempotent, safe-from-everywhere.
 *
 * Writes lifecycle moments (signup, first add-to-cart, first order, cart
 * abandonment, etc.) into `analytics_events` so server-side cron jobs
 * (nightly-maintenance, cart-abandonment-email, win-back) can react. The
 * client never sends emails directly — it only emits the moment.
 *
 * Idempotency: each call may pass a `dedupeKey`. We persist a 30-day
 * cooldown ledger in localStorage so the same event for the same user is
 * never recorded twice from the same browser.
 */

import { supabase } from "@/integrations/supabase/client";

export type LifecycleEvent =
  | "signup"
  | "first_add_to_cart"
  | "first_order"
  | "cart_abandoned"
  | "reorder_due"
  | "win_back_30d"
  | "birthday"
  | "anniversary"
  | "tier_upgrade"
  | "wishlist_price_drop";

const LEDGER_KEY = "odhra_lifecycle_ledger_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Ledger = Record<string, number>;

function readLedger(): Ledger {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Ledger;
    const now = Date.now();
    // prune expired entries opportunistically
    let dirty = false;
    for (const k of Object.keys(parsed)) {
      if (now - parsed[k] > TTL_MS) { delete parsed[k]; dirty = true; }
    }
    if (dirty) localStorage.setItem(LEDGER_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return {};
  }
}

function writeLedger(ledger: Ledger) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    /* quota / privacy mode: ignore */
  }
}

function sessionId(): string {
  try {
    const k = "odhra_session_id";
    let v = sessionStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID?.() ?? `${Date.now()}`;
      sessionStorage.setItem(k, v);
    }
    return v;
  } catch {
    return "anon";
  }
}

export interface LogLifecycleOptions {
  /** Stable key for dedupe (e.g. "first_order:<userId>"). Defaults to event name. */
  dedupeKey?: string;
  /** Override TTL for this event's cooldown window (ms). */
  cooldownMs?: number;
  /** Attach the authenticated user id when known. */
  userId?: string | null;
  /** Arbitrary structured payload (sanitized — never log raw PII). */
  payload?: Record<string, unknown>;
}

/**
 * Fire-and-forget lifecycle event. Always resolves to a boolean indicating
 * whether the event was actually written (false = deduped or telemetry failed).
 */
export async function logLifecycleEvent(
  event: LifecycleEvent,
  opts: LogLifecycleOptions = {},
): Promise<boolean> {
  const key = opts.dedupeKey ?? event;
  const cooldown = opts.cooldownMs ?? TTL_MS;
  const ledger = readLedger();
  const last = ledger[key];
  const now = Date.now();
  if (last && now - last < cooldown) return false;

  ledger[key] = now;
  writeLedger(ledger);

  try {
    await supabase.from("analytics_events").insert({
      event_type: `lifecycle.${event}`,
      session_id: sessionId(),
      user_id: opts.userId ?? null,
      properties: {
        event,
        dedupe_key: key,
        ...(opts.payload ?? {}),
      } as never,
    });
    return true;
  } catch {
    // Never throw from telemetry — but roll back the ledger so a retry can succeed
    delete ledger[key];
    writeLedger(ledger);
    return false;
  }
}
