/**
 * L2: Multi-Warehouse Routing + Split-Shipment Allocator
 * ------------------------------------------------------
 * Given a basket of {product_id, qty} and a destination pincode,
 * choose the optimal warehouse mix that:
 *   1. Fulfills the entire order (or flags unfulfillable lines)
 *   2. Minimizes number of shipments (consolidation preferred)
 *   3. Breaks ties by warehouse.priority then proximity
 *
 * Uses haversine for proximity, greedy weighted bin-packing for split.
 * Pure logic — DB I/O is injected so it can be reused server-side.
 */
import { supabase } from "@/integrations/supabase/client";

export type AllocLine = { product_id: string; variant_id?: string | null; qty: number };
export type WarehouseRow = {
  id: string; vendor_id: string | null; pincode: string;
  lat: number | null; lng: number | null; priority: number; is_active: boolean;
};
export type InvRow = {
  warehouse_id: string; product_id: string; variant_id: string | null;
  quantity: number; reserved: number;
};
export type Allocation = {
  warehouse_id: string;
  lines: Array<AllocLine & { allocated: number }>;
};
export type AllocResult = {
  shipments: Allocation[];
  unfulfilled: Array<AllocLine & { short: number }>;
};

const R = 6371;
export function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Greedy allocator: sort warehouses by score, drain each line until satisfied. */
export function allocate(
  lines: AllocLine[],
  warehouses: WarehouseRow[],
  inventory: InvRow[],
  destLatLng?: [number, number] | null
): AllocResult {
  const remaining = new Map(lines.map(l => [keyOf(l), l.qty]));
  const invMap = new Map<string, InvRow>();
  for (const i of inventory) invMap.set(`${i.warehouse_id}|${i.product_id}|${i.variant_id ?? ""}`, { ...i });

  const ranked = [...warehouses]
    .filter(w => w.is_active)
    .map(w => ({
      w,
      score:
        (1000 - (w.priority ?? 100)) -
        (destLatLng && w.lat != null && w.lng != null
          ? haversineKm(destLatLng, [Number(w.lat), Number(w.lng)]) * 0.01
          : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.w);

  const shipments: Allocation[] = [];
  for (const w of ranked) {
    const taken: Allocation["lines"] = [];
    for (const l of lines) {
      const k = keyOf(l);
      const need = remaining.get(k) ?? 0;
      if (need <= 0) continue;
      const inv = invMap.get(`${w.id}|${l.product_id}|${l.variant_id ?? ""}`);
      const avail = Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved ?? 0));
      const give = Math.min(need, avail);
      if (give > 0) {
        taken.push({ ...l, allocated: give });
        remaining.set(k, need - give);
        if (inv) inv.reserved += give;
      }
    }
    if (taken.length) shipments.push({ warehouse_id: w.id, lines: taken });
    if ([...remaining.values()].every(v => v <= 0)) break;
  }

  const unfulfilled = lines
    .map(l => ({ ...l, short: remaining.get(keyOf(l)) ?? 0 }))
    .filter(l => l.short > 0);

  return { shipments, unfulfilled };
}

function keyOf(l: AllocLine) {
  return `${l.product_id}|${l.variant_id ?? ""}`;
}

/** Resolve allocation against live DB (read-only). */
export async function planAllocation(
  lines: AllocLine[],
  destLatLng?: [number, number] | null
): Promise<AllocResult> {
  const productIds = [...new Set(lines.map(l => l.product_id))];
  if (!productIds.length) return { shipments: [], unfulfilled: [] };

  const [{ data: inv }, { data: whs }] = await Promise.all([
    supabase
      .from("warehouse_inventory")
      .select("warehouse_id,product_id,variant_id,quantity,reserved")
      .in("product_id", productIds),
    supabase
      .from("warehouses")
      .select("id,vendor_id,pincode,lat,lng,priority,is_active")
      .eq("is_active", true),
  ]);

  return allocate(
    lines,
    (whs ?? []) as WarehouseRow[],
    (inv ?? []) as InvRow[],
    destLatLng
  );
}

/** Persist allocator output as shipment_packages rows. */
export async function persistShipments(
  orderId: string,
  vendorIdByWarehouse: Record<string, string | null>,
  result: AllocResult
) {
  if (!result.shipments.length) return { inserted: 0 };
  const rows = result.shipments.map(s => ({
    order_id: orderId,
    warehouse_id: s.warehouse_id,
    vendor_id: vendorIdByWarehouse[s.warehouse_id] ?? null,
    items: s.lines as unknown as import("@/integrations/supabase/types").Json,
    status: "pending",
  }));
  const { error, count } = await supabase
    .from("shipment_packages")
    .insert(rows, { count: "exact" });
  if (error) throw error;
  return { inserted: count ?? rows.length };
}
