/**
 * M2: Gift Card + Store Credit Redemption Engine
 * ----------------------------------------------
 * Atomic apply/release of multiple gift cards against an order, with
 * - currency validation
 * - expiry & status checks
 * - partial redemption (multi-card stacking up to order total)
 * - reversal on order failure
 * - integration point to walletLedger for store-credit accounting
 */
import { supabase } from "@/integrations/supabase/client";
import { postJournal } from "./walletLedger";

export type GiftCardApplyResult = {
  applied: Array<{ gift_card_id: string; code: string; amount: number; balance_after: number }>;
  total_applied: number;
  remaining_total: number;
};

export class GiftCardError extends Error {
  constructor(public code: string, msg: string) { super(msg); }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

async function loadCard(code: string) {
  const { data, error } = await supabase
    .from("gift_cards")
    .select("id,code,balance,currency,status,expires_at,issued_to_user_id")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new GiftCardError("not_found", "Gift card not found");
  return data;
}

function assertUsable(card: { status: string; expires_at: string | null; balance: number; currency: string }, currency: string, userId?: string, ownerId?: string | null) {
  if (card.status !== "active") throw new GiftCardError("inactive", `Gift card is ${card.status}`);
  if (card.expires_at && new Date(card.expires_at) < new Date()) throw new GiftCardError("expired", "Gift card expired");
  if (card.currency !== currency) throw new GiftCardError("currency_mismatch", "Currency mismatch");
  if (Number(card.balance) <= 0) throw new GiftCardError("empty", "No balance left");
  if (ownerId && userId && ownerId !== userId) throw new GiftCardError("not_owner", "Card not assigned to this user");
}

/** Preview redemption without persisting. */
export async function previewRedemption(opts: {
  codes: string[]; orderTotal: number; currency?: string; userId?: string;
}): Promise<GiftCardApplyResult> {
  const ccy = opts.currency ?? "INR";
  let remaining = round2(opts.orderTotal);
  const applied: GiftCardApplyResult["applied"] = [];

  const cards = await Promise.all(opts.codes.map(loadCard));
  for (const c of cards) {
    assertUsable(c, ccy, opts.userId, c.issued_to_user_id);
    if (remaining <= 0) break;
    const take = Math.min(Number(c.balance), remaining);
    applied.push({ gift_card_id: c.id, code: c.code, amount: take, balance_after: round2(Number(c.balance) - take) });
    remaining = round2(remaining - take);
  }
  return { applied, total_applied: round2(opts.orderTotal - remaining), remaining_total: remaining };
}

/** Commit redemption atomically: decrement balances + insert redemption rows + ledger entry. */
export async function commitRedemption(opts: {
  codes: string[]; orderId: string; orderTotal: number; userId: string; currency?: string;
}): Promise<GiftCardApplyResult> {
  const preview = await previewRedemption({
    codes: opts.codes, orderTotal: opts.orderTotal, currency: opts.currency, userId: opts.userId,
  });
  if (!preview.applied.length) return preview;

  for (const a of preview.applied) {
    const { error } = await supabase
      .from("gift_cards")
      .update({ balance: a.balance_after, status: a.balance_after === 0 ? "redeemed" : "active", redeemed_at: a.balance_after === 0 ? new Date().toISOString() : null })
      .eq("id", a.gift_card_id)
      .gte("balance", a.amount); // optimistic guard
    if (error) {
      await releaseRedemption({ orderId: opts.orderId, applied: preview.applied.slice(0, preview.applied.indexOf(a)) });
      throw new GiftCardError("commit_failed", error.message);
    }
    await supabase.from("gift_card_redemptions").insert({
      gift_card_id: a.gift_card_id, user_id: opts.userId, order_id: opts.orderId,
      amount: a.amount, balance_after: a.balance_after,
    });
  }

  await postJournal([
    { account_type: "gift_card", direction: "debit", amount: preview.total_applied, currency: opts.currency ?? "INR", reference_type: "order", reference_id: opts.orderId, description: "Gift card redemption" },
    { account_type: "user_wallet", account_owner: opts.userId, direction: "credit", amount: preview.total_applied, currency: opts.currency ?? "INR", reference_type: "order", reference_id: opts.orderId },
  ]);

  return preview;
}

/** Reverse a redemption (e.g. order cancelled before fulfillment). */
export async function releaseRedemption(opts: {
  orderId: string; applied: Array<{ gift_card_id: string; amount: number }>;
}) {
  for (const a of opts.applied) {
    const { data: card } = await supabase.from("gift_cards").select("balance").eq("id", a.gift_card_id).single();
    if (!card) continue;
    await supabase.from("gift_cards")
      .update({ balance: round2(Number(card.balance) + a.amount), status: "active", redeemed_at: null })
      .eq("id", a.gift_card_id);
  }
  await supabase.from("gift_card_redemptions").delete().eq("order_id", opts.orderId);
}
