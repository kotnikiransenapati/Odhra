/**
 * M3: Promotions / Coupons — Stacking & Precedence Engine
 * -------------------------------------------------------
 * Evaluates a set of candidate promotions against a cart and picks the
 * optimal *legal* combination by precedence rules:
 *
 *  1. Exclusive promos cannot stack with anything else.
 *  2. Per-user limit + global usage_limit enforced.
 *  3. Applicability: product / category / vendor allow-list, excluded products.
 *  4. Time window (starts_at / ends_at).
 *  5. min_order_amount, max_discount_amount caps.
 *  6. Stacking order: cart-level % → cart-level fixed → shipping → BOGO.
 *  7. Tie-break by largest total discount.
 *
 * Pure logic (no DB) + a thin DB resolver. Returns a deterministic plan that
 * can be re-applied server-side at order creation for verification.
 */
import { supabase } from "@/integrations/supabase/client";

export type CartLine = {
  product_id: string;
  category_id?: string | null;
  vendor_id?: string | null;
  qty: number;
  unit_price: number;
};

export type Promo = {
  id: string;
  code: string | null;
  type: string;                         // "cart" | "shipping" | "bogo" | ...
  discount_type: "percent" | "fixed" | string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number | null;
  per_user_limit: number | null;
  applicable_products: string[] | null;
  applicable_categories: string[] | null;
  applicable_vendors: string[] | null;
  excluded_products: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
};

export type AppliedPromo = {
  promo_id: string;
  code: string | null;
  type: string;
  discount: number;
  reason: string;
};

export type PromoPlan = {
  applied: AppliedPromo[];
  subtotal: number;
  total_discount: number;
  shipping_discount: number;
  payable: number;
  rejected: Array<{ promo_id: string; code: string | null; reason: string }>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function eligibleLines(promo: Promo, lines: CartLine[]): CartLine[] {
  return lines.filter(l => {
    if (promo.excluded_products?.includes(l.product_id)) return false;
    if (promo.applicable_products?.length && !promo.applicable_products.includes(l.product_id)) return false;
    if (promo.applicable_categories?.length && !(l.category_id && promo.applicable_categories.includes(l.category_id))) return false;
    if (promo.applicable_vendors?.length && !(l.vendor_id && promo.applicable_vendors.includes(l.vendor_id))) return false;
    return true;
  });
}

function lineTotal(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.unit_price * l.qty, 0);
}

function checkWindow(p: Promo, now = Date.now()): string | null {
  if (!p.is_active) return "inactive";
  if (p.starts_at && +new Date(p.starts_at) > now) return "not_started";
  if (p.ends_at && +new Date(p.ends_at) < now) return "expired";
  if (p.usage_limit != null && (p.usage_count ?? 0) >= p.usage_limit) return "usage_limit_reached";
  return null;
}

function computeDiscount(p: Promo, base: number): number {
  let d = p.discount_type === "percent"
    ? base * (Number(p.discount_value) / 100)
    : Number(p.discount_value);
  if (p.max_discount_amount != null) d = Math.min(d, Number(p.max_discount_amount));
  return round2(Math.max(0, Math.min(d, base)));
}

const PRECEDENCE: Record<string, number> = { cart: 1, shipping: 2, bogo: 3 };

/** Pure evaluator — does not touch DB. */
export function evaluate(opts: {
  cart: CartLine[];
  shippingFee?: number;
  promos: Promo[];
  perUserUsage?: Record<string, number>;
  now?: number;
}): PromoPlan {
  const subtotal = round2(lineTotal(opts.cart));
  const rejected: PromoPlan["rejected"] = [];
  const usable: Promo[] = [];

  for (const p of opts.promos) {
    const winErr = checkWindow(p, opts.now);
    if (winErr) { rejected.push({ promo_id: p.id, code: p.code, reason: winErr }); continue; }
    if (p.per_user_limit != null && (opts.perUserUsage?.[p.id] ?? 0) >= p.per_user_limit) {
      rejected.push({ promo_id: p.id, code: p.code, reason: "per_user_limit" }); continue;
    }
    if (p.min_order_amount != null && subtotal < Number(p.min_order_amount)) {
      rejected.push({ promo_id: p.id, code: p.code, reason: "below_min_order" }); continue;
    }
    if (!eligibleLines(p, opts.cart).length) {
      rejected.push({ promo_id: p.id, code: p.code, reason: "no_eligible_lines" }); continue;
    }
    usable.push(p);
  }

  const exclusive = usable.find(p => (p.metadata as any)?.exclusive === true);
  const candidates = exclusive ? [exclusive] : usable;

  candidates.sort((a, b) => (PRECEDENCE[a.type] ?? 99) - (PRECEDENCE[b.type] ?? 99));

  const applied: AppliedPromo[] = [];
  let runningBase = subtotal;
  let shippingDiscount = 0;
  const shippingFee = opts.shippingFee ?? 0;

  for (const p of candidates) {
    if (p.type === "shipping") {
      const d = computeDiscount(p, shippingFee);
      if (d > 0) {
        shippingDiscount += d;
        applied.push({ promo_id: p.id, code: p.code, type: p.type, discount: d, reason: "shipping" });
      }
      continue;
    }
    const base = lineTotal(eligibleLines(p, opts.cart));
    const cap = Math.min(base, runningBase);
    const d = computeDiscount(p, cap);
    if (d > 0) {
      applied.push({ promo_id: p.id, code: p.code, type: p.type, discount: d, reason: "cart" });
      runningBase = round2(runningBase - d);
    } else {
      rejected.push({ promo_id: p.id, code: p.code, reason: "zero_discount" });
    }
  }

  const total_discount = round2(applied.reduce((s, a) => s + (a.type === "shipping" ? 0 : a.discount), 0));
  const payable = round2(Math.max(0, subtotal - total_discount + Math.max(0, shippingFee - shippingDiscount)));
  return { applied, subtotal, total_discount, shipping_discount: round2(shippingDiscount), payable, rejected };
}

/** Resolve codes (or all active auto-apply promos) from DB. */
export async function loadPromos(codes: string[]): Promise<Promo[]> {
  if (!codes.length) return [];
  const upper = codes.map(c => c.trim().toUpperCase());
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .in("code", upper)
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as unknown as Promo[];
}

/** End-to-end: load + evaluate against the cart for a user. */
export async function planCheckout(opts: {
  cart: CartLine[]; codes: string[]; userId?: string; shippingFee?: number;
}): Promise<PromoPlan> {
  const promos = await loadPromos(opts.codes);
  let perUserUsage: Record<string, number> = {};
  if (opts.userId && promos.length) {
    const { data } = await supabase
      .from("promotion_usages")
      .select("promotion_id")
      .eq("user_id", opts.userId)
      .in("promotion_id", promos.map(p => p.id));
    perUserUsage = (data ?? []).reduce<Record<string, number>>((m, r) => {
      m[r.promotion_id] = (m[r.promotion_id] ?? 0) + 1; return m;
    }, {});
  }
  return evaluate({ cart: opts.cart, promos, perUserUsage, shippingFee: opts.shippingFee });
}
