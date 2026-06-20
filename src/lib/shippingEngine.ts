/**
 * Batch L1 — Unified shipping engine: Delhivery + India Post rate-shopping.
 *
 * Single API for the checkout & admin layer to:
 *   - Resolve serviceability for a (pincode, weight, COD?) tuple across carriers
 *   - Quote rates from every supported carrier in parallel
 *   - Pick the cheapest serviceable carrier (rate-shopping)
 *   - Generate manifests + pickup schedules
 *
 * Carriers are pluggable. Each implements the `ShippingCarrier` interface; the
 * engine itself contains no carrier-specific knowledge — that lives in adapter
 * modules so we can add Ekart, BlueDart, etc. later.
 *
 * Security:
 *   - All carrier API keys are read from server-side env via edge functions;
 *     this file is safe to import on the client only when used through the
 *     thin `quote()` wrapper that calls an edge function. Direct adapter use
 *     is for edge function code only.
 */

export type CarrierId = 'delhivery' | 'indiapost';
export type ServiceType = 'surface' | 'express' | 'speed_post' | 'registered';

export interface ShipmentInput {
  origin_pincode: string;
  destination_pincode: string;
  weight_grams: number;
  declared_value: number;
  cod_amount?: number; // 0 / undefined ⇒ prepaid
  dimensions_cm?: { length: number; breadth: number; height: number };
}

export interface Quote {
  carrier: CarrierId;
  service: ServiceType;
  rate: number;                 // ₹ inc. fuel / GST when known
  cod_charge: number;
  total: number;
  expected_days: { min: number; max: number };
  serviceable: boolean;
  reason?: string;              // when not serviceable
  raw?: Record<string, unknown>;
}

export interface ShippingCarrier {
  id: CarrierId;
  serviceability(input: ShipmentInput): Promise<{ ok: boolean; reason?: string }>;
  quote(input: ShipmentInput): Promise<Quote[]>;
  createManifest?(opts: { shipments: Array<{ awb: string }> }): Promise<{ manifest_id: string; pdf_url?: string }>;
  schedulePickup?(opts: { pickup_date: string; pickup_location: string; count: number }): Promise<{ pickup_id: string }>;
}

/* -------------------------------------------------------------------------- */
/* Engine                                                                      */
/* -------------------------------------------------------------------------- */

export class ShippingEngine {
  constructor(private carriers: ShippingCarrier[]) {}

  /**
   * Get every carrier's best quote in parallel.
   * Failures are returned as `serviceable: false` rather than throwing so a
   * single broken carrier doesn't take down checkout.
   */
  async quoteAll(input: ShipmentInput): Promise<Quote[]> {
    const settled = await Promise.allSettled(this.carriers.map((c) => c.quote(input)));
    const flat: Quote[] = [];
    settled.forEach((res, i) => {
      const c = this.carriers[i];
      if (res.status === 'fulfilled') {
        flat.push(...res.value);
      } else {
        flat.push({
          carrier: c.id, service: 'surface',
          rate: 0, cod_charge: 0, total: 0,
          expected_days: { min: 0, max: 0 },
          serviceable: false,
          reason: (res.reason as Error)?.message ?? 'carrier_error',
        });
      }
    });
    return flat;
  }

  /**
   * Rate-shopping — pick the cheapest serviceable quote, breaking ties by
   * fastest expected delivery, then by carrier preference order.
   */
  async pickCheapest(
    input: ShipmentInput,
    preferenceOrder: CarrierId[] = ['delhivery', 'indiapost'],
  ): Promise<{ chosen: Quote | null; alternates: Quote[] }> {
    const quotes = (await this.quoteAll(input)).filter((q) => q.serviceable);
    if (quotes.length === 0) return { chosen: null, alternates: [] };

    const prefIdx = (c: CarrierId) => {
      const i = preferenceOrder.indexOf(c);
      return i === -1 ? preferenceOrder.length : i;
    };

    quotes.sort((a, b) => {
      if (a.total !== b.total) return a.total - b.total;
      const aMid = (a.expected_days.min + a.expected_days.max) / 2;
      const bMid = (b.expected_days.min + b.expected_days.max) / 2;
      if (aMid !== bMid) return aMid - bMid;
      return prefIdx(a.carrier) - prefIdx(b.carrier);
    });

    return { chosen: quotes[0], alternates: quotes.slice(1) };
  }

  async createManifests(byCarrier: Record<CarrierId, string[]>): Promise<Record<string, { manifest_id: string; pdf_url?: string }>> {
    const out: Record<string, { manifest_id: string; pdf_url?: string }> = {};
    await Promise.all(this.carriers.map(async (c) => {
      const awbs = byCarrier[c.id];
      if (!awbs?.length || !c.createManifest) return;
      try {
        out[c.id] = await c.createManifest({ shipments: awbs.map((awb) => ({ awb })) });
      } catch (err) {
        console.warn(`manifest_failed:${c.id}`, (err as Error).message);
      }
    }));
    return out;
  }
}

/* -------------------------------------------------------------------------- */
/* Reference adapters (network calls are stubs; replace with edge-fn callers)  */
/* -------------------------------------------------------------------------- */

/** Delhivery rate calculator — wrap the existing edge function. */
export function delhiveryAdapter(opts: { invoke: (path: string, body: unknown) => Promise<Record<string, unknown>> }): ShippingCarrier {
  return {
    id: 'delhivery',
    async serviceability(input) {
      const res = await opts.invoke('delivery-webhook/serviceability', { pincode: input.destination_pincode });
      return { ok: Boolean(res.serviceable), reason: (res.reason as string) ?? undefined };
    },
    async quote(input) {
      const r = (await opts.invoke('delivery-webhook/rate', input)) as {
        rate?: number; cod_charge?: number; min_days?: number; max_days?: number; service?: ServiceType;
      };
      const rate = Number(r.rate ?? 0);
      const cod = Number(r.cod_charge ?? 0);
      return [{
        carrier: 'delhivery',
        service: r.service ?? 'surface',
        rate, cod_charge: cod, total: rate + cod,
        expected_days: { min: Number(r.min_days ?? 2), max: Number(r.max_days ?? 5) },
        serviceable: rate > 0,
        raw: r,
      }];
    },
  };
}

/** India Post — wraps existing `indiapost-proxy` edge function. */
export function indiaPostAdapter(opts: { invoke: (path: string, body: unknown) => Promise<Record<string, unknown>> }): ShippingCarrier {
  return {
    id: 'indiapost',
    async serviceability(input) {
      const r = await opts.invoke('indiapost-proxy/pincode', { pincode: input.destination_pincode });
      return { ok: Boolean(r.serviceable), reason: (r.reason as string) ?? undefined };
    },
    async quote(input) {
      const r = (await opts.invoke('indiapost-proxy/rate', input)) as {
        speed_post?: { rate: number; min_days: number; max_days: number };
        registered?: { rate: number; min_days: number; max_days: number };
      };
      const out: Quote[] = [];
      if (r.speed_post) {
        out.push({
          carrier: 'indiapost', service: 'speed_post',
          rate: r.speed_post.rate, cod_charge: 0, total: r.speed_post.rate,
          expected_days: { min: r.speed_post.min_days, max: r.speed_post.max_days },
          serviceable: r.speed_post.rate > 0,
        });
      }
      if (r.registered) {
        out.push({
          carrier: 'indiapost', service: 'registered',
          rate: r.registered.rate, cod_charge: 0, total: r.registered.rate,
          expected_days: { min: r.registered.min_days, max: r.registered.max_days },
          serviceable: r.registered.rate > 0,
        });
      }
      return out;
    },
  };
}
