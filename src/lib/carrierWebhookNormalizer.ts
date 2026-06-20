/**
 * L4a: Carrier Webhook Normalizer
 * -------------------------------
 * Maps raw carrier status codes (Delhivery, India Post, Shiprocket) into a
 * unified status vocabulary the rest of the app can rely on. Includes
 * HMAC-SHA256 signature helpers for inbound webhook verification.
 */

export type UnifiedStatus =
  | "pending" | "manifested" | "picked_up" | "in_transit"
  | "out_for_delivery" | "delivered" | "rto_initiated" | "rto_delivered"
  | "failed_delivery" | "lost" | "damaged" | "cancelled";

export type NormalizedEvent = {
  carrier: "delhivery" | "indiapost" | "shiprocket" | "unknown";
  awb: string;
  status: UnifiedStatus;
  raw_code: string;
  description: string;
  location?: string;
  city?: string;
  state?: string;
  occurred_at: string; // ISO
  raw: unknown;
};

const DELHIVERY_MAP: Record<string, UnifiedStatus> = {
  Manifested: "manifested",
  "Not Picked": "pending",
  "In Transit": "in_transit",
  Dispatched: "out_for_delivery",
  Delivered: "delivered",
  RTO: "rto_initiated",
  "RTO Delivered": "rto_delivered",
  Pending: "failed_delivery",
  Lost: "lost",
  Damaged: "damaged",
  Cancelled: "cancelled",
};

const INDIAPOST_MAP: Record<string, UnifiedStatus> = {
  "Item Booked": "manifested",
  "Item Bagged": "in_transit",
  "Item Dispatched": "in_transit",
  "Item Received": "in_transit",
  "Out for Delivery": "out_for_delivery",
  "Item Delivered": "delivered",
  "Item Returned": "rto_initiated",
  "Delivery Attempted": "failed_delivery",
};

const SHIPROCKET_MAP: Record<string, UnifiedStatus> = {
  NEW: "pending",
  "PICKUP SCHEDULED": "manifested",
  "PICKED UP": "picked_up",
  "IN TRANSIT": "in_transit",
  "OUT FOR DELIVERY": "out_for_delivery",
  DELIVERED: "delivered",
  RTO: "rto_initiated",
  "RTO DELIVERED": "rto_delivered",
  CANCELED: "cancelled",
  LOST: "lost",
};

function lookup(map: Record<string, UnifiedStatus>, code: string): UnifiedStatus {
  return map[code] ?? map[code.toUpperCase()] ?? map[code.trim()] ?? "in_transit";
}

export function normalizeDelhivery(payload: any): NormalizedEvent[] {
  const shipments = payload?.Shipment ? [payload.Shipment] : payload?.shipments ?? [];
  return shipments.flatMap((s: any) => {
    const awb = String(s?.AWB ?? s?.awb ?? "");
    const scans = s?.Scans ?? s?.scans ?? [];
    return scans.map((scan: any) => {
      const d = scan?.ScanDetail ?? scan;
      const code = String(d?.Scan ?? d?.ScanType ?? d?.Status ?? "");
      return {
        carrier: "delhivery" as const,
        awb,
        status: lookup(DELHIVERY_MAP, code),
        raw_code: code,
        description: String(d?.Instructions ?? d?.ScanDetail ?? code),
        location: d?.ScannedLocation,
        city: d?.City,
        state: d?.StateCode,
        occurred_at: new Date(d?.ScanDateTime ?? Date.now()).toISOString(),
        raw: scan,
      };
    });
  });
}

export function normalizeIndiaPost(payload: any): NormalizedEvent[] {
  const awb = String(payload?.articleNumber ?? payload?.awb ?? "");
  const events = payload?.events ?? payload?.trackingEvents ?? [];
  return events.map((e: any) => ({
    carrier: "indiapost" as const,
    awb,
    status: lookup(INDIAPOST_MAP, String(e?.eventType ?? e?.status ?? "")),
    raw_code: String(e?.eventType ?? e?.status ?? ""),
    description: String(e?.description ?? e?.eventType ?? ""),
    location: e?.officeName,
    city: e?.city,
    state: e?.state,
    occurred_at: new Date(e?.eventDate ?? e?.timestamp ?? Date.now()).toISOString(),
    raw: e,
  }));
}

export function normalizeShiprocket(payload: any): NormalizedEvent[] {
  const data = payload?.tracking_data ?? payload;
  const awb = String(data?.awb_code ?? data?.awb ?? "");
  const activities = data?.shipment_track_activities ?? [];
  return activities.map((a: any) => ({
    carrier: "shiprocket" as const,
    awb,
    status: lookup(SHIPROCKET_MAP, String(a?.["sr-status-label"] ?? a?.status ?? "")),
    raw_code: String(a?.["sr-status-label"] ?? a?.status ?? ""),
    description: String(a?.activity ?? a?.status ?? ""),
    location: a?.location,
    occurred_at: new Date(a?.date ?? Date.now()).toISOString(),
    raw: a,
  }));
}

export function normalize(carrier: string, payload: any): NormalizedEvent[] {
  switch (carrier.toLowerCase()) {
    case "delhivery":  return normalizeDelhivery(payload);
    case "indiapost":
    case "india_post": return normalizeIndiaPost(payload);
    case "shiprocket": return normalizeShiprocket(payload);
    default:           return [];
  }
}

/** HMAC-SHA256 verification (constant-time compare). */
export async function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string,
  algo: "sha256" | "sha1" = "sha256"
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: algo === "sha256" ? "SHA-256" : "SHA-1" },
    false, ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  const provided = signature.replace(/^sha256=/i, "").toLowerCase();
  if (computed.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}
