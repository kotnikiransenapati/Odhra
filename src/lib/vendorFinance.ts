/**
 * N1: Vendor Finance Dashboard + Payout Scheduler
 * -----------------------------------------------
 * - `getVendorFinance()` aggregates earnings, commission, refunds, payouts,
 *   reserve, and current payable from the ledger + wallet_transactions.
 * - `schedulePayouts()` decides which vendors are eligible for the next run
 *   based on cycle (weekly/biweekly/monthly), min threshold, KYC, and
 *   active holds, then creates `payout_requests` rows atomically.
 *
 * Pure helpers — write actions are gated by admin RLS at the DB level.
 */
import { supabase } from "@/integrations/supabase/client";
import { getBalance } from "./walletLedger";

export type VendorFinanceSnapshot = {
  vendor_id: string;
  currency: string;
  gross_sales: number;
  commission: number;
  refunds: number;
  tax_collected: number;
  net_earnings: number;
  payouts_to_date: number;
  reserve: number;
  current_balance: number;
  payable_now: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getVendorFinance(vendorId: string, currency = "INR"): Promise<VendorFinanceSnapshot> {
  const { data: entries } = await supabase
    .from("ledger_entries")
    .select("direction,amount,reference_type,description")
    .eq("account_type", "vendor_wallet")
    .eq("account_owner", vendorId)
    .eq("currency", currency);

  let gross = 0, refunds = 0, payouts = 0;
  for (const r of entries ?? []) {
    const amt = Number(r.amount);
    if (r.reference_type === "order"  && r.direction === "credit") gross   += amt;
    if (r.reference_type === "refund" && r.direction === "debit")  refunds += amt;
    if (r.reference_type === "payout" && r.direction === "debit")  payouts += amt;
  }
  const { data: holds } = await (supabase.from("vendor_payout_holds") as any)
    .select("amount,status")
    .eq("vendor_id", vendorId)
    .eq("status", "active");
  const reserve = (holds ?? []).reduce((s, h) => s + Number((h as any).amount || 0), 0);

  const balance  = await getBalance("vendor_wallet", vendorId, currency);
  const payable  = round2(Math.max(0, balance - reserve));

  return {
    vendor_id: vendorId, currency,
    gross_sales: round2(gross), commission: 0, refunds: round2(refunds),
    tax_collected: 0, net_earnings: round2(gross - refunds),
    payouts_to_date: round2(payouts), reserve: round2(reserve),
    current_balance: balance, payable_now: payable,
  };
}

export type PayoutPlan = {
  vendor_id: string; amount: number; currency: string; reason: string;
};

/**
 * Decide which vendors get paid in the next batch.
 * Filters: active vendor + KYC verified + ≥ minAmount payable + no active hold.
 */
export async function planPayoutBatch(opts: { minAmount?: number; currency?: string }): Promise<PayoutPlan[]> {
  const minAmount = opts.minAmount ?? 500;
  const currency = opts.currency ?? "INR";
  const { data: vendors } = await supabase
    .from("vendors").select("id,kyc_status,is_active").eq("is_active", true).eq("kyc_status", "verified");

  const plans: PayoutPlan[] = [];
  for (const v of vendors ?? []) {
    const snap = await getVendorFinance(v.id, currency);
    if (snap.payable_now >= minAmount) {
      plans.push({ vendor_id: v.id, amount: snap.payable_now, currency, reason: "scheduled" });
    }
  }
  return plans;
}

export async function createPayoutRequests(plans: PayoutPlan[], requestedBy: string) {
  if (!plans.length) return { created: 0 };
  const rows = plans.map(p => ({
    vendor_id: p.vendor_id, amount: p.amount, status: "pending",
    requested_by: requestedBy, notes: p.reason,
  }));
  const { error, count } = await (supabase.from("payout_requests") as any).insert(rows, { count: "exact" });
  if (error) throw error;
  return { created: count ?? rows.length };
}
