import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCircuitBreaker } from "../_shared/circuitBreaker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── Track consignment via India Post public tracking API ──
async function trackConsignment(trackingNumber: string) {
  // India Post doesn't have a public REST API for tracking.
  // We use the postal pincode API for pincode checks and maintain
  // tracking status internally via webhook/manual updates.
  // For now, return stored tracking data from DB.
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("indiapost_shipments")
    .select("*")
    .eq("consignment_number", trackingNumber)
    .single();

  if (error) throw new Error(`Shipment not found: ${trackingNumber}`);
  return data;
}

// ── Check pincode serviceability ──
async function checkPincode(pincode: string) {
  const supabase = getAdminClient();

  // Check cache first
  const { data: cached } = await supabase
    .from("indiapost_pincode_cache")
    .select("*")
    .eq("pincode", pincode)
    .single();

  if (cached && new Date(cached.cached_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    return cached;
  }

  // Fetch from India Post API
  const res = await withCircuitBreaker({
    supabase,
    serviceKey: "indiapost",
    operation: async () => {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      if (!response.ok) throw new Error(`India Post pincode lookup failed: ${response.status}`);
      return response;
    },
  });
  const result = await res.json();

  if (!result?.[0] || result[0].Status !== "Success" || !result[0].PostOffice?.length) {
    // Mark as not serviceable
    const notServiceable = {
      pincode,
      is_serviceable: false,
      office_name: null,
      office_type: null,
      delivery_status: "Non-Delivery",
      district: null,
      state: null,
      division: null,
      region: null,
      circle: null,
      services_available: [],
      cached_at: new Date().toISOString(),
    };

    await supabase.from("indiapost_pincode_cache").upsert(notServiceable, { onConflict: "pincode" });
    return notServiceable;
  }

  const po = result[0].PostOffice[0];
  // Check if any delivery office exists
  const deliveryOffice = result[0].PostOffice.find(
    (o: any) => o.DeliveryStatus === "Delivery" || o.BranchType === "Head Post Office"
  ) || po;

  const services: string[] = ["registered_post", "speed_post"];
  if (deliveryOffice.BranchType === "Head Post Office" || deliveryOffice.BranchType === "Sub Post Office") {
    services.push("ems_speed_post", "business_parcel");
  }

  const pincodeData = {
    pincode,
    office_name: deliveryOffice.Name,
    office_type: deliveryOffice.BranchType,
    delivery_status: deliveryOffice.DeliveryStatus || "Delivery",
    division: deliveryOffice.Division,
    region: deliveryOffice.Region,
    circle: deliveryOffice.Circle,
    district: deliveryOffice.District,
    state: deliveryOffice.State,
    country: deliveryOffice.Country || "India",
    services_available: services,
    is_serviceable: deliveryOffice.DeliveryStatus === "Delivery" || deliveryOffice.DeliveryStatus === "Non-Delivery" ? deliveryOffice.DeliveryStatus === "Delivery" : true,
    cached_at: new Date().toISOString(),
  };

  await supabase.from("indiapost_pincode_cache").upsert(pincodeData, { onConflict: "pincode" });
  return pincodeData;
}

// ── Calculate shipping rate ──
async function calculateRate(params: {
  origin_pincode: string;
  destination_pincode: string;
  weight_grams: number;
  service_type?: string;
  declared_value?: number;
  cod?: boolean;
}) {
  const supabase = getAdminClient();
  const serviceType = params.service_type || "speed_post";
  const originPrefix = params.origin_pincode.substring(0, 3);
  const destPrefix = params.destination_pincode.substring(0, 3);

  // Determine zone
  let zone = "zone_c"; // default
  if (originPrefix === destPrefix) {
    zone = "local";
  } else {
    const { data: zoneData } = await supabase
      .from("indiapost_zones")
      .select("zone")
      .eq("origin_prefix", originPrefix)
      .eq("destination_prefix", destPrefix)
      .single();

    if (zoneData) {
      zone = zoneData.zone;
    } else {
      // Heuristic: same state prefix = zone_a, nearby = zone_b, far = zone_c/d
      const originRegion = parseInt(originPrefix.charAt(0));
      const destRegion = parseInt(destPrefix.charAt(0));
      const diff = Math.abs(originRegion - destRegion);
      if (diff === 0) zone = "zone_a";
      else if (diff === 1) zone = "zone_b";
      else if (diff <= 3) zone = "zone_c";
      else zone = "zone_d";
    }
  }

  // Find matching rate card
  const { data: rates, error } = await supabase
    .from("indiapost_rate_cards")
    .select("*")
    .eq("service_type", serviceType)
    .eq("zone", zone)
    .eq("is_active", true)
    .lte("weight_slab_min_grams", params.weight_grams)
    .gte("weight_slab_max_grams", params.weight_grams)
    .limit(1);

  if (error || !rates?.length) {
    // Fallback: get highest weight slab
    const { data: fallbackRates } = await supabase
      .from("indiapost_rate_cards")
      .select("*")
      .eq("service_type", serviceType)
      .eq("zone", zone)
      .eq("is_active", true)
      .order("weight_slab_max_grams", { ascending: false })
      .limit(1);

    if (!fallbackRates?.length) {
      return {
        service_type: serviceType,
        zone,
        base_rate: 50,
        total_rate: 50,
        cod_charge: params.cod ? 45 : 0,
        insurance: 0,
        estimated_days_min: 3,
        estimated_days_max: 7,
        error: "No rate card found, using default",
      };
    }

    return buildRateResponse(fallbackRates[0], params, zone);
  }

  return buildRateResponse(rates[0], params, zone);
}

function buildRateResponse(rate: any, params: any, zone: string) {
  const weightGrams = params.weight_grams;
  let baseRate = rate.base_rate;

  // Additional charges for weight beyond slab
  if (weightGrams > rate.weight_slab_max_grams && rate.additional_per_500g > 0) {
    const extraWeight = weightGrams - rate.weight_slab_max_grams;
    const extraSlabs = Math.ceil(extraWeight / 500);
    baseRate += extraSlabs * rate.additional_per_500g;
  }

  const codCharge = params.cod ? rate.cod_charge : 0;
  const insurance = params.declared_value && rate.insurance_percent > 0
    ? Math.round(params.declared_value * rate.insurance_percent / 100)
    : 0;

  return {
    service_type: rate.service_type,
    zone,
    base_rate: baseRate,
    cod_charge: codCharge,
    insurance,
    total_rate: baseRate + codCharge + insurance,
    estimated_days_min: rate.estimated_days_min,
    estimated_days_max: rate.estimated_days_max,
    weight_grams: weightGrams,
  };
}

// ── Create / book shipment ──
async function createShipment(params: {
  order_id?: string;
  sub_order_id?: string;
  consignment_number: string;
  article_type?: string;
  sender_name: string;
  sender_pincode: string;
  receiver_name: string;
  receiver_pincode: string;
  weight_grams: number;
  declared_value?: number;
  cod_amount?: number;
  expected_delivery_date?: string;
}) {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("indiapost_shipments")
    .insert({
      order_id: params.order_id || null,
      sub_order_id: params.sub_order_id || null,
      consignment_number: params.consignment_number,
      article_type: params.article_type || "speed_post",
      booking_date: new Date().toISOString(),
      sender_name: params.sender_name,
      sender_pincode: params.sender_pincode,
      receiver_name: params.receiver_name,
      receiver_pincode: params.receiver_pincode,
      origin_pincode: params.sender_pincode,
      destination_pincode: params.receiver_pincode,
      weight_grams: params.weight_grams,
      declared_value: params.declared_value || 0,
      cod_amount: params.cod_amount || 0,
      current_status: "booked",
      expected_delivery_date: params.expected_delivery_date || null,
      tracking_events: [
        {
          status: "booked",
          location: params.sender_pincode,
          description: "Shipment booked at " + params.sender_pincode,
          timestamp: new Date().toISOString(),
        },
      ],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create shipment: ${error.message}`);

  // Update sub_order status if linked
  if (params.sub_order_id) {
    await supabase
      .from("sub_orders")
      .update({ status: "shipped" })
      .eq("id", params.sub_order_id);
  }

  return data;
}

// ── Update shipment status (webhook / manual) ──
async function updateShipmentStatus(params: {
  consignment_number: string;
  status: string;
  location?: string;
  description?: string;
  timestamp?: string;
}) {
  const supabase = getAdminClient();

  const { data: shipment, error: fetchErr } = await supabase
    .from("indiapost_shipments")
    .select("*")
    .eq("consignment_number", params.consignment_number)
    .single();

  if (fetchErr || !shipment) throw new Error("Shipment not found");

  const events = (shipment.tracking_events as any[]) || [];
  events.push({
    status: params.status,
    location: params.location || "",
    description: params.description || params.status,
    timestamp: params.timestamp || new Date().toISOString(),
  });

  const updates: Record<string, any> = {
    current_status: params.status,
    current_location: params.location || shipment.current_location,
    tracking_events: events,
    last_tracked_at: new Date().toISOString(),
  };

  if (params.status === "delivered") {
    updates.delivered_at = params.timestamp || new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("indiapost_shipments")
    .update(updates)
    .eq("consignment_number", params.consignment_number)
    .select()
    .single();

  if (error) throw new Error(`Failed to update: ${error.message}`);

  // Sync to sub_order status
  if (shipment.sub_order_id) {
    const statusMap: Record<string, string> = {
      booked: "shipped",
      dispatched: "shipped",
      in_transit: "shipped",
      out_for_delivery: "shipped",
      delivered: "delivered",
      returned: "returned",
      cancelled: "cancelled",
    };
    const subOrderStatus = statusMap[params.status];
    if (subOrderStatus) {
      await supabase
        .from("sub_orders")
        .update({ status: subOrderStatus })
        .eq("id", shipment.sub_order_id);
    }
  }

  return data;
}

// ── Get all available services for a route ──
async function getAvailableServices(originPincode: string, destPincode: string, weightGrams: number) {
  const serviceTypes = ["speed_post", "registered_post", "ems_speed_post", "business_parcel"];
  const results = [];

  for (const svc of serviceTypes) {
    try {
      const rate = await calculateRate({
        origin_pincode: originPincode,
        destination_pincode: destPincode,
        weight_grams: weightGrams,
        service_type: svc,
      });
      results.push(rate);
    } catch {
      // Service not available for this route/weight
    }
  }

  return results.sort((a, b) => a.total_rate - b.total_rate);
}

// ── Main router ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();

    let result: any;
    switch (action) {
      case "track":
        result = await trackConsignment(params.tracking_number);
        break;
      case "check_pincode":
        result = await checkPincode(params.pincode);
        break;
      case "calculate_rate":
        result = await calculateRate(params);
        break;
      case "available_services":
        result = await getAvailableServices(params.origin_pincode, params.destination_pincode, params.weight_grams || 500);
        break;
      case "create_shipment":
        result = await createShipment(params);
        break;
      case "update_status":
        result = await updateShipmentStatus(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("India Post proxy error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
