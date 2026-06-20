/**
 * M4: Checkout Fraud / Risk Scoring Engine
 * ----------------------------------------
 * Combines rule-based signals + behavioural heuristics into a 0–100 risk score
 * that drives one of three actions: ALLOW (<40), REVIEW (40–74), BLOCK (>=75).
 *
 * Inputs are deliberately decoupled from a request lifecycle so this can run
 * either client-side as a pre-check or inside an edge function on order create.
 */
import { supabase } from "@/integrations/supabase/client";

export type RiskAction = "allow" | "review" | "block";
export type RiskSignal = { code: string; weight: number; reason: string };

export type RiskInput = {
  user_id?: string | null;
  email?: string;
  ip?: string;
  device_id?: string;
  order_total: number;
  currency?: string;
  is_guest: boolean;
  payment_method: "razorpay" | "cod" | "wallet" | "upi" | string;
  shipping_pincode?: string;
  billing_pincode?: string;
  account_age_days?: number;
  prior_orders?: number;
  prior_chargebacks?: number;
  cart_item_count?: number;
  velocity_orders_last_hour?: number;
  velocity_orders_last_day?: number;
  uses_disposable_email?: boolean;
  email_domain_age_days?: number | null;
};

export type RiskResult = {
  score: number;
  action: RiskAction;
  signals: RiskSignal[];
  reasons: string[];
};

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","tempmail.com","yopmail.com","10minutemail.com","trashmail.com",
]);

export function isDisposableEmail(email?: string): boolean {
  if (!email) return false;
  const d = email.split("@")[1]?.toLowerCase();
  return !!d && DISPOSABLE_DOMAINS.has(d);
}

/** Pure scoring — sums weighted signals, clamps 0–100. */
export function score(input: RiskInput): RiskResult {
  const signals: RiskSignal[] = [];

  if (input.is_guest)                                      signals.push({ code: "GUEST_CHECKOUT",     weight: 8,  reason: "Guest checkout"});
  if ((input.account_age_days ?? 9999) < 1)                signals.push({ code: "NEW_ACCOUNT",        weight: 14, reason: "Account < 24h old"});
  else if ((input.account_age_days ?? 9999) < 7)           signals.push({ code: "YOUNG_ACCOUNT",      weight: 6,  reason: "Account < 7d old"});

  if ((input.prior_chargebacks ?? 0) >= 1)                 signals.push({ code: "PRIOR_CHARGEBACK",   weight: 35, reason: "Previous chargeback"});
  if ((input.prior_orders ?? 0) === 0 && input.order_total > 10000)
    signals.push({ code: "HIGH_VALUE_FIRST_ORDER",         weight: 18, reason: "Large first order"});
  if (input.order_total > 50000)                           signals.push({ code: "VERY_HIGH_VALUE",    weight: 12, reason: "Order > ₹50k"});

  if ((input.velocity_orders_last_hour ?? 0) >= 3)         signals.push({ code: "VELOCITY_1H",        weight: 22, reason: "3+ orders / 1h"});
  if ((input.velocity_orders_last_day ?? 0) >= 8)          signals.push({ code: "VELOCITY_1D",        weight: 12, reason: "8+ orders / 24h"});

  if (input.uses_disposable_email || isDisposableEmail(input.email))
                                                            signals.push({ code: "DISPOSABLE_EMAIL",   weight: 20, reason: "Disposable email domain"});
  if (input.email_domain_age_days != null && input.email_domain_age_days < 30)
                                                            signals.push({ code: "NEW_EMAIL_DOMAIN",   weight: 10, reason: "Email domain < 30d old"});

  if (input.payment_method === "cod" && input.order_total > 25000)
                                                            signals.push({ code: "HIGH_COD",           weight: 15, reason: "COD over ₹25k"});

  if (input.shipping_pincode && input.billing_pincode &&
      input.shipping_pincode !== input.billing_pincode)
                                                            signals.push({ code: "PIN_MISMATCH",       weight: 5,  reason: "Ship/bill pincode differ"});

  if ((input.cart_item_count ?? 0) > 25)                   signals.push({ code: "BULK_CART",          weight: 6,  reason: "25+ items in cart"});

  const raw = signals.reduce((s, x) => s + x.weight, 0);
  const finalScore = Math.max(0, Math.min(100, raw));
  const action: RiskAction = finalScore >= 75 ? "block" : finalScore >= 40 ? "review" : "allow";

  return { score: finalScore, action, signals, reasons: signals.map(s => s.reason) };
}

/** Pull live behavioural counters and run scoring. */
export async function scoreCheckout(base: Omit<RiskInput, "velocity_orders_last_hour" | "velocity_orders_last_day" | "prior_orders" | "prior_chargebacks" | "account_age_days">): Promise<RiskResult> {
  let velocityH = 0, velocityD = 0, priorOrders = 0, priorCb = 0, ageDays: number | undefined;

  if (base.user_id) {
    const sinceH = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const sinceD = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count: ch }, { count: cd }, { count: cAll }, { count: cCb }, prof] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", base.user_id).gte("created_at", sinceH),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", base.user_id).gte("created_at", sinceD),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", base.user_id),
      supabase.from("disputes").select("id", { count: "exact", head: true }).eq("customer_id", base.user_id),
      supabase.from("profiles").select("created_at").eq("id", base.user_id).maybeSingle(),
    ]);
    velocityH = ch ?? 0; velocityD = cd ?? 0; priorOrders = cAll ?? 0; priorCb = cCb ?? 0;
    if (prof.data?.created_at) ageDays = Math.floor((Date.now() - +new Date(prof.data.created_at)) / 86400000);
  }

  return score({
    ...base,
    account_age_days: ageDays,
    prior_orders: priorOrders,
    prior_chargebacks: priorCb,
    velocity_orders_last_hour: velocityH,
    velocity_orders_last_day: velocityD,
  });
}

/** Persist for analytics / manual review. */
export async function persistRisk(userId: string, result: RiskResult, orderId?: string) {
  const payload = {
    user_id: userId,
    score: result.score,
    tier: result.action,
    factors: { signals: result.signals, order_id: orderId } as never,
    last_computed_at: new Date().toISOString(),
  };
  await (supabase.from("customer_risk_scores") as any).upsert(payload, { onConflict: "user_id" });
}
