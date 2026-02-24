import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

async function getShiprocketToken(): Promise<string> {
  const email = Deno.env.get("SHIPROCKET_EMAIL");
  const password = Deno.env.get("SHIPROCKET_PASSWORD");
  if (!email || !password) throw new Error("Shiprocket credentials not configured");

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shiprocket auth failed [${res.status}]: ${body}`);
  }

  const data = await res.json();
  return data.token;
}

async function shiprocketRequest(
  token: string,
  endpoint: string,
  method = "GET",
  body?: unknown
) {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${SHIPROCKET_BASE}${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(`Shiprocket API error [${res.status}]: ${JSON.stringify(data)}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error("Unauthorized");

      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
      if (!isAdmin) throw new Error("Admin access required");
    }

    const { action, payload } = await req.json();
    const shiprocketToken = await getShiprocketToken();

    let result: unknown;

    switch (action) {
      // ---- Order Management ----
      case "create_order": {
        result = await shiprocketRequest(shiprocketToken, "/orders/create/adhoc", "POST", payload);
        // Save shipment record
        if (result && (result as any).order_id) {
          await supabase.from("shiprocket_shipments").insert({
            order_id: payload.lovable_order_id,
            sub_order_id: payload.lovable_sub_order_id,
            shiprocket_order_id: String((result as any).order_id),
            shiprocket_shipment_id: String((result as any).shipment_id || ""),
            status: "created",
            delivery_address: payload.shipping_address,
            weight: payload.weight,
            dimensions: payload.dimensions,
            raw_response: result,
          });
        }
        break;
      }

      case "assign_awb": {
        result = await shiprocketRequest(shiprocketToken, "/courier/assign/awb", "POST", {
          shipment_id: payload.shipment_id,
          courier_id: payload.courier_id,
        });
        if (result && (result as any).response?.data?.awb_code) {
          await supabase
            .from("shiprocket_shipments")
            .update({
              awb_code: (result as any).response.data.awb_code,
              courier_name: (result as any).response.data.courier_name,
              courier_id: payload.courier_id,
              status: "awb_assigned",
            })
            .eq("shiprocket_shipment_id", String(payload.shipment_id));
        }
        break;
      }

      case "generate_label": {
        result = await shiprocketRequest(shiprocketToken, "/courier/generate/label", "POST", {
          shipment_id: [payload.shipment_id],
        });
        if (result && (result as any).label_url) {
          await supabase
            .from("shiprocket_shipments")
            .update({ label_url: (result as any).label_url, status: "label_generated" })
            .eq("shiprocket_shipment_id", String(payload.shipment_id));
        }
        break;
      }

      case "generate_manifest": {
        result = await shiprocketRequest(shiprocketToken, "/manifests/generate", "POST", {
          shipment_id: [payload.shipment_id],
        });
        if (result && (result as any).manifest_url) {
          await supabase
            .from("shiprocket_shipments")
            .update({ manifest_url: (result as any).manifest_url })
            .eq("shiprocket_shipment_id", String(payload.shipment_id));
        }
        break;
      }

      case "schedule_pickup": {
        result = await shiprocketRequest(shiprocketToken, "/courier/generate/pickup", "POST", {
          shipment_id: [payload.shipment_id],
        });
        if (result) {
          await supabase
            .from("shiprocket_shipments")
            .update({
              pickup_scheduled_date: (result as any).pickup_scheduled_date || new Date().toISOString(),
              status: "pickup_scheduled",
            })
            .eq("shiprocket_shipment_id", String(payload.shipment_id));
        }
        break;
      }

      // ---- Tracking ----
      case "track_shipment": {
        if (payload.awb_code) {
          result = await shiprocketRequest(shiprocketToken, `/courier/track/awb/${payload.awb_code}`);
        } else if (payload.shipment_id) {
          result = await shiprocketRequest(shiprocketToken, `/courier/track/shipment/${payload.shipment_id}`);
        }
        break;
      }

      // ---- Courier Services ----
      case "check_serviceability": {
        const params = new URLSearchParams({
          pickup_postcode: String(payload.pickup_postcode),
          delivery_postcode: String(payload.delivery_postcode),
          weight: String(payload.weight || 0.5),
          cod: String(payload.cod ? 1 : 0),
        });
        result = await shiprocketRequest(shiprocketToken, `/courier/serviceability/?${params}`);
        break;
      }

      case "get_courier_list": {
        result = await shiprocketRequest(shiprocketToken, "/courier/courierListWithCounts");
        break;
      }

      // ---- Pickup Locations ----
      case "get_pickup_locations": {
        result = await shiprocketRequest(shiprocketToken, "/settings/company/pickup");
        break;
      }

      case "add_pickup_location": {
        result = await shiprocketRequest(shiprocketToken, "/settings/company/addpickup", "POST", payload);
        break;
      }

      // ---- Returns ----
      case "create_return": {
        result = await shiprocketRequest(shiprocketToken, "/orders/create/return", "POST", payload);
        break;
      }

      // ---- Cancel ----
      case "cancel_shipment": {
        result = await shiprocketRequest(shiprocketToken, "/orders/cancel", "POST", {
          ids: [payload.order_id],
        });
        if (result) {
          await supabase
            .from("shiprocket_shipments")
            .update({ status: "cancelled" })
            .eq("shiprocket_order_id", String(payload.order_id));
        }
        break;
      }

      // ---- NDR (Non-Delivery Report) ----
      case "get_ndr": {
        result = await shiprocketRequest(shiprocketToken, "/ndr/all");
        break;
      }

      case "ndr_action": {
        result = await shiprocketRequest(shiprocketToken, "/ndr", "POST", payload);
        break;
      }

      // ---- Rate Calculator ----
      case "calculate_rates": {
        result = await shiprocketRequest(shiprocketToken, "/courier/serviceability/", "GET");
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Shiprocket proxy error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
