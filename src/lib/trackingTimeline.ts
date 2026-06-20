/**
 * L4b: Unified Tracking Timeline
 * ------------------------------
 * Merges shipment_events (carrier scans) with shipment_packages metadata
 * and order_activity_log into a chronological, deduplicated timeline a
 * buyer can render in one component.
 */
import { supabase } from "@/integrations/supabase/client";
import type { UnifiedStatus } from "./carrierWebhookNormalizer";

export type TimelineEntry = {
  id: string;
  at: string;
  source: "carrier" | "system" | "order";
  status: UnifiedStatus | string;
  title: string;
  description?: string;
  location?: string;
  carrier?: string;
  awb?: string;
};

const STATUS_TITLES: Record<string, string> = {
  pending: "Order placed",
  manifested: "Shipment created",
  picked_up: "Picked up from seller",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rto_initiated: "Return to origin initiated",
  rto_delivered: "Returned to seller",
  failed_delivery: "Delivery attempt failed",
  lost: "Shipment reported lost",
  damaged: "Shipment damaged",
  cancelled: "Shipment cancelled",
};

export async function getOrderTimeline(orderId: string): Promise<TimelineEntry[]> {
  const [pkgs, activity] = await Promise.all([
    supabase
      .from("shipment_packages")
      .select("id,carrier,awb,status,created_at,updated_at")
      .eq("order_id", orderId),
    supabase
      .from("order_activity_log")
      .select("id,activity_type,title,description,created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);

  const pkgRows = pkgs.data ?? [];
  const pkgIds = pkgRows.map(p => p.id);

  let events: any[] = [];
  if (pkgIds.length) {
    const { data } = await supabase
      .from("shipment_events")
      .select("id,shipment_id,event_code,event_description,location,timestamp")
      .in("shipment_id", pkgIds)
      .order("timestamp", { ascending: true });
    events = data ?? [];
  }

  const out: TimelineEntry[] = [];

  for (const a of activity.data ?? []) {
    out.push({
      id: `act-${a.id}`,
      at: a.created_at,
      source: "order",
      status: a.activity_type,
      title: a.title ?? humanize(a.activity_type),
      description: a.description ?? undefined,
    });
  }

  const pkgById = new Map(pkgRows.map(p => [p.id, p]));
  for (const e of events) {
    const p = pkgById.get(e.shipment_id);
    out.push({
      id: `evt-${e.id}`,
      at: e.timestamp,
      source: "carrier",
      status: e.event_code,
      title: STATUS_TITLES[e.event_code] ?? humanize(e.event_code),
      description: e.event_description,
      location: e.location,
      carrier: p?.carrier ?? undefined,
      awb: p?.awb ?? undefined,
    });
  }

  // Dedupe consecutive identical (status + awb)
  out.sort((a, b) => +new Date(a.at) - +new Date(b.at));
  return out.filter((e, i, arr) => {
    const prev = arr[i - 1];
    return !prev || prev.status !== e.status || prev.awb !== e.awb;
  });
}

function humanize(code: string) {
  return code.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
