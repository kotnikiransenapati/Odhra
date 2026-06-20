/**
 * L3: Returns / Reverse-Pickup / QC Pipeline
 * ------------------------------------------
 * Pure state-machine + helpers around the existing return_requests / return_items tables.
 *
 *   requested → approved → pickup_scheduled → picked → in_transit → received
 *                                                              → qc_pending
 *                                                                → qc_passed → refunded → closed
 *                                                                → qc_failed → closed (no refund) | partial
 *
 * Refund mode determines downstream side-effect (store credit / original / replacement).
 * QC results are stored as JSONB on return_requests.qc_result with per-item breakdown.
 */
import { supabase } from "@/integrations/supabase/client";

export type ReturnStatus =
  | "requested" | "approved" | "rejected"
  | "pickup_scheduled" | "picked" | "in_transit"
  | "received" | "qc_pending" | "qc_passed" | "qc_failed"
  | "refunded" | "closed";

const TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested:        ["approved", "rejected"],
  approved:         ["pickup_scheduled", "rejected"],
  pickup_scheduled: ["picked", "rejected"],
  picked:           ["in_transit"],
  in_transit:       ["received"],
  received:         ["qc_pending"],
  qc_pending:       ["qc_passed", "qc_failed"],
  qc_passed:        ["refunded"],
  qc_failed:        ["closed", "refunded"],     // partial refund allowed
  refunded:         ["closed"],
  rejected:         ["closed"],
  closed:           [],
};

export function canTransition(from: ReturnStatus, to: ReturnStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export type QcItemResult = {
  return_item_id: string;
  qc_status: "passed" | "failed" | "partial";
  qc_notes?: string;
  accepted_qty: number;
  restock: boolean;
};

export type CreateReturnInput = {
  order_id: string;
  sub_order_id: string;
  vendor_id: string;
  customer_id: string;
  return_reason: string;
  return_reason_details?: string;
  rma_type?: "return" | "exchange" | "replacement";
  refund_method?: "original" | "store_credit" | "exchange";
  evidence_urls?: string[];
  items: Array<{ order_item_id: string; quantity: number; refund_amount: number; reason?: string }>;
};

function newRmaNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `RMA-${ymd}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function createReturn(input: CreateReturnInput) {
  const totalRefund = input.items.reduce((s, i) => s + Number(i.refund_amount || 0), 0);
  const { data: rr, error } = await supabase
    .from("return_requests")
    .insert({
      order_id: input.order_id,
      sub_order_id: input.sub_order_id,
      vendor_id: input.vendor_id,
      customer_id: input.customer_id,
      return_number: newRmaNumber(),
      return_reason: input.return_reason,
      return_reason_details: input.return_reason_details,
      rma_type: input.rma_type ?? "return",
      refund_method: input.refund_method ?? "original",
      refund_amount: totalRefund,
      evidence_urls: input.evidence_urls ?? [],
      status: "requested",
    })
    .select("*")
    .single();
  if (error) throw error;

  if (input.items.length) {
    const rows = input.items.map(i => ({
      return_request_id: rr.id,
      order_item_id: i.order_item_id,
      quantity: i.quantity,
      refund_amount: i.refund_amount,
      reason: i.reason ?? input.return_reason,
      qc_status: "pending" as const,
    }));
    const { error: itErr } = await supabase.from("return_items").insert(rows);
    if (itErr) throw itErr;
  }
  return rr;
}

export async function transitionReturn(
  id: string,
  to: ReturnStatus,
  patch: Record<string, unknown> = {}
) {
  const { data: current, error: getErr } = await supabase
    .from("return_requests").select("status").eq("id", id).single();
  if (getErr) throw getErr;
  if (!canTransition(current.status as ReturnStatus, to)) {
    throw new Error(`Invalid transition: ${current.status} → ${to}`);
  }
  const stamps: Record<string, string> = {};
  if (to === "picked") stamps.picked_up_at = new Date().toISOString();
  if (to === "received") stamps.received_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("return_requests")
    .update({ status: to, ...stamps, ...patch })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Record per-item QC results and roll up parent status. */
export async function recordQc(returnId: string, results: QcItemResult[]) {
  for (const r of results) {
    const { error } = await supabase
      .from("return_items")
      .update({ qc_status: r.qc_status, qc_notes: r.qc_notes, restock: r.restock })
      .eq("id", r.return_item_id);
    if (error) throw error;
  }
  const allPassed = results.every(r => r.qc_status === "passed");
  const allFailed = results.every(r => r.qc_status === "failed");
  const parentStatus: ReturnStatus = allPassed ? "qc_passed" : allFailed ? "qc_failed" : "qc_passed";
  return transitionReturn(returnId, parentStatus, {
    qc_result: { items: results, summary: { allPassed, allFailed } },
    inspected_at: new Date().toISOString(),
  });
}

/** Compute payable refund after QC (sum of accepted_qty * unit refund). */
export async function computeFinalRefund(returnId: string): Promise<number> {
  const { data, error } = await supabase
    .from("return_items")
    .select("quantity,refund_amount,qc_status")
    .eq("return_request_id", returnId);
  if (error) throw error;
  return (data ?? [])
    .filter(i => i.qc_status === "passed" || i.qc_status === "partial")
    .reduce((s, i) => s + Number(i.refund_amount || 0), 0);
}

/** Restock items into warehouse_inventory after a passed QC. */
export async function restockFromReturn(returnId: string, warehouseId: string) {
  const { data: items, error } = await supabase
    .from("return_items")
    .select("order_item_id,quantity,qc_status,restock")
    .eq("return_request_id", returnId);
  if (error) throw error;

  // Resolve product_id from order_items
  const ids = (items ?? []).filter(i => i.restock && i.qc_status === "passed").map(i => i.order_item_id);
  if (!ids.length) return { restocked: 0 };

  const { data: oi, error: oiErr } = await supabase
    .from("order_items").select("id,product_id").in("id", ids);
  if (oiErr) throw oiErr;
  const byId = new Map(oi?.map(o => [o.id, o]) ?? []);

  let restocked = 0;
  for (const it of items!) {
    if (!it.restock || it.qc_status !== "passed") continue;
    const oiRow = byId.get(it.order_item_id);
    if (!oiRow?.product_id) continue;
    const { data: existing } = await supabase
      .from("warehouse_inventory")
      .select("id,quantity")
      .eq("warehouse_id", warehouseId)
      .eq("product_id", oiRow.product_id)
      .maybeSingle();
    if (existing) {
      await supabase.from("warehouse_inventory")
        .update({ quantity: (existing.quantity ?? 0) + it.quantity })
        .eq("id", existing.id);
    } else {
      await supabase.from("warehouse_inventory").insert({
        warehouse_id: warehouseId,
        product_id: oiRow.product_id,
        quantity: it.quantity,
      });
    }
    restocked += it.quantity;
  }
  return { restocked };
}
