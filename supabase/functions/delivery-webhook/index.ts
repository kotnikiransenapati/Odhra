import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeliveryEvent {
  partner: string; // 'shiprocket', 'delhivery', etc.
  awb: string;
  status: string;
  status_code?: string;
  location?: string;
  city?: string;
  state?: string;
  timestamp: string;
  remarks?: string;
  raw_payload?: any;
}

const STATUS_MAPPING: Record<string, Record<string, string>> = {
  shiprocket: {
    "AWB Assigned": "manifest_created",
    "Pickup Scheduled": "pickup_scheduled",
    "Picked Up": "picked_up",
    "In Transit": "in_transit",
    "Out For Delivery": "out_for_delivery",
    "Delivered": "delivered",
    "RTO Initiated": "rto_initiated",
    "RTO Delivered": "rto_delivered",
    "Cancelled": "cancelled",
    "Lost": "lost",
  },
  delhivery: {
    "Manifested": "manifest_created",
    "In Transit": "in_transit",
    "Dispatched": "in_transit",
    "Out for Delivery": "out_for_delivery",
    "Delivered": "delivered",
    "RTO": "rto_initiated",
    "RTO-Delivered": "rto_delivered",
  },
  bluedart: {
    "Shipment Received": "picked_up",
    "In Transit": "in_transit",
    "Out for Delivery": "out_for_delivery",
    "Delivered": "delivered",
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const partner = new URL(req.url).searchParams.get("partner") || "shiprocket";

    // Parse webhook payload based on partner
    let event: DeliveryEvent;

    if (partner === "shiprocket") {
      event = {
        partner,
        awb: body.awb || body.shipment_id,
        status: body.current_status || body.status,
        status_code: body.status_code,
        location: body.current_location,
        city: body.delivered_to?.city,
        state: body.delivered_to?.state,
        timestamp: body.etd || body.timestamp || new Date().toISOString(),
        remarks: body.remarks,
        raw_payload: body,
      };
    } else if (partner === "delhivery") {
      const scan = body.Shipment?.Scans?.[0]?.ScanDetail || {};
      event = {
        partner,
        awb: body.Shipment?.AWB,
        status: scan.ScanType || body.Status,
        location: scan.ScannedLocation,
        city: scan.ScannedCity,
        timestamp: scan.ScanDateTime || new Date().toISOString(),
        remarks: scan.Instructions,
        raw_payload: body,
      };
    } else {
      event = {
        partner,
        awb: body.awb || body.tracking_number,
        status: body.status,
        location: body.location,
        city: body.city,
        state: body.state,
        timestamp: body.timestamp || new Date().toISOString(),
        raw_payload: body,
      };
    }

    // Find shipment by AWB
    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("*, sub_orders(*, orders(customer_id, order_number))")
      .eq("awb_number", event.awb)
      .single();

    if (shipmentError || !shipment) {
      console.error("Shipment not found for AWB:", event.awb);
      return new Response(
        JSON.stringify({ success: false, error: "Shipment not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Map status to internal status
    const partnerMapping = STATUS_MAPPING[partner] || {};
    const newStatus = partnerMapping[event.status] || shipment.current_status;

    // Insert tracking event
    await supabase.from("shipment_events").insert({
      shipment_id: shipment.id,
      event_code: event.status_code || event.status,
      event_description: event.remarks || event.status,
      location: event.location,
      location_city: event.city,
      location_state: event.state,
      timestamp: event.timestamp,
      raw_data: event.raw_payload,
    });

    // Update shipment status
    const updates: any = {
      current_status: newStatus,
      current_location: event.location || event.city,
    };

    if (newStatus === "picked_up" && !shipment.picked_up_at) {
      updates.picked_up_at = event.timestamp;
    } else if (newStatus === "in_transit" && !shipment.in_transit_at) {
      updates.in_transit_at = event.timestamp;
    } else if (newStatus === "out_for_delivery" && !shipment.out_for_delivery_at) {
      updates.out_for_delivery_at = event.timestamp;
    } else if (newStatus === "delivered" && !shipment.delivered_at) {
      updates.delivered_at = event.timestamp;
    }

    await supabase
      .from("shipments")
      .update(updates)
      .eq("id", shipment.id);

    // Update sub_order status
    if (newStatus === "delivered") {
      await supabase
        .from("sub_orders")
        .update({ status: "delivered", delivered_at: event.timestamp })
        .eq("id", shipment.sub_order_id);
    } else if (newStatus === "in_transit" || newStatus === "picked_up") {
      await supabase
        .from("sub_orders")
        .update({ status: "shipped", shipped_at: shipment.picked_up_at || event.timestamp })
        .eq("id", shipment.sub_order_id);
    }

    // Send WhatsApp notification for key events
    const order = shipment.sub_orders?.orders;
    if (order && ["picked_up", "out_for_delivery", "delivered"].includes(newStatus)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", order.customer_id)
        .single();

      if (profile?.phone) {
        const templateMap: Record<string, string> = {
          picked_up: "order_shipped",
          out_for_delivery: "out_for_delivery",
          delivered: "order_delivered",
        };

        await supabase.functions.invoke("send-whatsapp", {
          body: {
            phone_number: profile.phone,
            template_name: templateMap[newStatus],
            template_params: {
              customer_name: profile.full_name || "Customer",
              order_number: order.order_number,
              courier_name: shipment.courier_name || partner,
              tracking_url: `${Deno.env.get("SITE_URL") || ""}/track-order/${order.order_number}`,
            },
            user_id: order.customer_id,
            reference_type: "shipment",
            reference_id: shipment.id,
          },
        });
      }
    }

    console.log(`Shipment ${event.awb} updated to ${newStatus}`);

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in delivery-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
