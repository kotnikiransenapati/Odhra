/**
 * M1: Wallet Ledger (Double-Entry Accounting)
 * -------------------------------------------
 * Every value movement is recorded as a balanced journal of debits + credits
 * sharing a single `txn_id`. The DB function `assert_ledger_balanced(txn_id)`
 * enforces invariants. This module exposes high-level helpers for common flows
 * (top-up, purchase, refund, loyalty award/redeem, vendor payout).
 *
 * Convention:
 *   debit  = value leaving an account
 *   credit = value entering an account
 *   Sum(debit) == Sum(credit) per (txn_id, currency).
 */
import { supabase } from "@/integrations/supabase/client";

export type AccountType =
  | "user_wallet" | "vendor_wallet" | "loyalty_points" | "store_credit"
  | "platform_revenue" | "platform_payable" | "tax_payable"
  | "refund_clearing" | "gift_card";

export type LedgerLine = {
  account_type: AccountType;
  account_owner?: string | null;
  direction: "debit" | "credit";
  amount: number;
  currency?: string;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function assertBalanced(lines: LedgerLine[]) {
  const byCcy = new Map<string, { d: number; c: number }>();
  for (const l of lines) {
    if (l.amount <= 0) throw new Error("Ledger amount must be positive");
    const k = l.currency ?? "INR";
    const slot = byCcy.get(k) ?? { d: 0, c: 0 };
    if (l.direction === "debit") slot.d += l.amount; else slot.c += l.amount;
    byCcy.set(k, slot);
  }
  for (const [ccy, { d, c }] of byCcy) {
    if (round4(d) !== round4(c)) {
      throw new Error(`Unbalanced ledger in ${ccy}: debit=${d} credit=${c}`);
    }
  }
}

/** Post a balanced journal entry. Returns the txn_id. */
export async function postJournal(lines: LedgerLine[], txnId?: string): Promise<string> {
  assertBalanced(lines);
  const txn = txnId ?? crypto.randomUUID();
  const rows = lines.map(l => ({
    txn_id: txn,
    account_type: l.account_type,
    account_owner: l.account_owner ?? null,
    direction: l.direction,
    currency: l.currency ?? "INR",
    amount: round4(l.amount),
    reference_type: l.reference_type ?? null,
    reference_id: l.reference_id ?? null,
    description: l.description ?? null,
    metadata: (l.metadata ?? {}) as never,
  }));
  const { error } = await supabase.from("ledger_entries").insert(rows);
  if (error) throw error;
  return txn;
}

/** Compute live balance for an account (credits − debits). */
export async function getBalance(
  accountType: AccountType, ownerId: string, currency = "INR"
): Promise<number> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("direction,amount")
    .eq("account_type", accountType)
    .eq("account_owner", ownerId)
    .eq("currency", currency);
  if (error) throw error;
  let bal = 0;
  for (const r of data ?? []) bal += r.direction === "credit" ? Number(r.amount) : -Number(r.amount);
  return round4(bal);
}

// ───────────────── High-level flows ─────────────────

/** User pays from wallet, vendor wallet credited (minus commission). */
export async function recordOrderSettlement(opts: {
  orderId: string;
  userId: string;
  vendorId: string;
  gross: number;
  commission: number;
  tax: number;
  currency?: string;
}) {
  const { orderId, userId, vendorId, gross, commission, tax } = opts;
  const ccy = opts.currency ?? "INR";
  const vendorNet = round4(gross - commission - tax);
  return postJournal([
    { account_type: "user_wallet",      account_owner: userId,   direction: "debit",  amount: gross, currency: ccy, reference_type: "order", reference_id: orderId, description: "Order payment" },
    { account_type: "vendor_wallet",    account_owner: vendorId, direction: "credit", amount: vendorNet, currency: ccy, reference_type: "order", reference_id: orderId },
    { account_type: "platform_revenue", direction: "credit", amount: commission, currency: ccy, reference_type: "order", reference_id: orderId, description: "Commission" },
    { account_type: "tax_payable",      direction: "credit", amount: tax, currency: ccy, reference_type: "order", reference_id: orderId, description: "GST collected" },
  ]);
}

/** Refund flow: vendor + platform debited, user credited. */
export async function recordRefund(opts: {
  orderId: string; refundId: string; userId: string; vendorId: string;
  refundAmount: number; commissionReversal: number; taxReversal: number; currency?: string;
}) {
  const ccy = opts.currency ?? "INR";
  const vendorPortion = round4(opts.refundAmount - opts.commissionReversal - opts.taxReversal);
  return postJournal([
    { account_type: "vendor_wallet",    account_owner: opts.vendorId, direction: "debit",  amount: vendorPortion, currency: ccy, reference_type: "refund", reference_id: opts.refundId },
    { account_type: "platform_revenue", direction: "debit",  amount: opts.commissionReversal, currency: ccy, reference_type: "refund", reference_id: opts.refundId },
    { account_type: "tax_payable",      direction: "debit",  amount: opts.taxReversal, currency: ccy, reference_type: "refund", reference_id: opts.refundId },
    { account_type: "user_wallet",      account_owner: opts.userId, direction: "credit", amount: opts.refundAmount, currency: ccy, reference_type: "refund", reference_id: opts.refundId, description: "Refund credited" },
  ], opts.refundId);
}

/** Loyalty points (separate currency "PTS"). */
export async function awardLoyalty(userId: string, points: number, ref?: { type: string; id: string }) {
  return postJournal([
    { account_type: "platform_payable", direction: "debit",  amount: points, currency: "PTS", reference_type: ref?.type, reference_id: ref?.id, description: "Loyalty points issued" },
    { account_type: "loyalty_points",   account_owner: userId, direction: "credit", amount: points, currency: "PTS", reference_type: ref?.type, reference_id: ref?.id },
  ]);
}

export async function redeemLoyalty(userId: string, points: number, orderId: string) {
  return postJournal([
    { account_type: "loyalty_points",   account_owner: userId, direction: "debit",  amount: points, currency: "PTS", reference_type: "order", reference_id: orderId, description: "Points redeemed" },
    { account_type: "platform_payable", direction: "credit", amount: points, currency: "PTS", reference_type: "order", reference_id: orderId },
  ]);
}

/** Vendor payout → debit vendor wallet, credit platform clearing. */
export async function recordVendorPayout(vendorId: string, amount: number, payoutId: string, currency = "INR") {
  return postJournal([
    { account_type: "vendor_wallet",    account_owner: vendorId, direction: "debit",  amount, currency, reference_type: "payout", reference_id: payoutId, description: "Payout to bank" },
    { account_type: "refund_clearing",  direction: "credit", amount, currency, reference_type: "payout", reference_id: payoutId },
  ], payoutId);
}
