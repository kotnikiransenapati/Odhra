import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveAppBaseUrl } from "../_shared/url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeliveryEvent {
  partner: string;
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
    "Reached at Destination Hub": "in_transit",
    "Out For Delivery": "out_for_delivery",
    "Delivered": "delivered",
    "Undelivered": "failed_delivery",
    "RTO Initiated": "rto_initiated",
    "RTO In-Transit": "rto_in_transit",
    "RTO Delivered": "rto_delivered",
    "Cancelled": "cancelled",
    "Lost": "lost",
    "Damaged": "damaged",
  },
  delhivery: {
    "Manifested": "manifest_created",
    "In Transit": "in_transit",
    "Dispatched": "in_transit",
    "Reached Destination Hub": "in_transit",
    "Out for Delivery": "out_for_delivery",
    "Delivered": "delivered",
    "Undelivered": "failed_delivery",
    "RTO": "rto_initiated",
    "RTO-Delivered": "rto_delivered",
    "Pending": "pending",
  },
  bluedart: {
    "Shipment Received": "picked_up",
    "In Transit": "in_transit",
    "Out for Delivery": "out_for_delivery",
    "Delivered": "delivered",
    "Not Delivered": "failed_delivery",
  },
  ecom_express: {
    "Pickup Done": "picked_up",
    "In Transit": "in_transit",
    "Out for Delivery": "out_for_delivery",
    "Delivered": "delivered",
    "Non Delivery": "failed_delivery",
    "RTO": "rto_initiated",
  },
};

// Human-readable event descriptions
const EVENT_DESCRIPTIONS: Record<string, string> = {
  manifest_created: "Shipment manifest created and ready for pickup",
  pickup_scheduled: "Pickup has been scheduled with the courier",
  picked_up: "Package picked up from seller",
  in_transit: "Package is in transit to your city",
  out_for_delivery: "Your package is out for delivery today!",
  delivered: "Package has been delivered successfully",
  failed_delivery: "Delivery attempt failed — will retry",
  rto_initiated: "Package is being returned to the seller",
  rto_in_transit: "Return shipment is in transit",
  rto_delivered: "Package returned to seller",
  cancelled: "Shipment has been cancelled",
  lost: "Shipment reported as lost — investigation in progress",
  damaged: "Package reported damaged during transit",
};

const NOTIFICATION_STATUSES = new Set([
  "picked_up", "in_transit", "out_for_delivery", "delivered",
  "failed_delivery", "rto_initiated", "lost", "damaged"
]);

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
        city: body.delivered_to?.city || body.city,
        state: body.delivered_to?.state || body.state,
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

    if (!event.awb) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing AWB number" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
    const newStatus = partnerMapping[event.status] || event.status;
    
    // Skip if same status (avoid duplicate events)
    if (newStatus === shipment.current_status && !event.remarks) {
      return new Response(
        JSON.stringify({ success: true, status: newStatus, message: "No status change" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const enrichedDescription = event.remarks || 
      EVENT_DESCRIPTIONS[newStatus] || 
      `Shipment status: ${event.status}`;

    // Insert tracking event
    await supabase.from("shipment_events").insert({
      shipment_id: shipment.id,
      event_code: event.status_code || newStatus,
      event_description: enrichedDescription,
      location: event.location,
      location_city: event.city,
      location_state: event.state,
      timestamp: event.timestamp,
      raw_data: event.raw_payload,
    });

    // Update shipment status
    const updates: Record<string, any> = {
      current_status: newStatus,
      current_location: event.location || event.city || shipment.current_location,
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

    // Track delivery attempts
    if (newStatus === "failed_delivery") {
      updates.delivery_attempts = (shipment.delivery_attempts || 0) + 1;
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
    } else if (["in_transit", "picked_up", "out_for_delivery"].includes(newStatus)) {
      await supabase
        .from("sub_orders")
        .update({ status: "shipped", shipped_at: shipment.picked_up_at || event.timestamp })
        .eq("id", shipment.sub_order_id);
    } else if (["rto_initiated", "rto_in_transit", "rto_delivered"].includes(newStatus)) {
      await supabase
        .from("sub_orders")
        .update({ status: "returned" })
        .eq("id", shipment.sub_order_id);
    }

    // Send notifications for key events
    const order = shipment.sub_orders?.orders;
    if (order && NOTIFICATION_STATUSES.has(newStatus)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", order.customer_id)
        .single();

      let customerEmail = profile?.email;
      if (!customerEmail) {
        const { data: authUser } = await supabase.auth.admin.getUserById(order.customer_id);
        customerEmail = authUser?.user?.email;
      }

      // Build rich email notification
      if (customerEmail) {
        const emailSubjects: Record<string, string> = {
          picked_up: `Your order ${order.order_number} has been picked up! 📦`,
          in_transit: `Your order ${order.order_number} is on its way! 🚚`,
          out_for_delivery: `Your order ${order.order_number} is out for delivery! 🎉`,
          delivered: `Your order ${order.order_number} has been delivered! ✅`,
          failed_delivery: `Delivery attempt for ${order.order_number} was unsuccessful`,
          rto_initiated: `Your order ${order.order_number} is being returned`,
          lost: `Important update about your order ${order.order_number}`,
          damaged: `Important update about your order ${order.order_number}`,
        };

        const emailData: Record<string, any> = {
          orderNumber: order.order_number,
          customerName: profile?.full_name || "Customer",
          orderId: shipment.sub_orders?.order_id,
          trackingNumber: event.awb,
          carrier: shipment.courier_name || partner,
          currentLocation: event.city || event.location || "In transit",
          estimatedDelivery: shipment.estimated_delivery_date
            ? new Date(shipment.estimated_delivery_date).toLocaleDateString("en-IN", {
                weekday: "long", month: "long", day: "numeric",
              })
            : "3-5 business days",
        };

        if (newStatus === "delivered") {
          emailData.deliveredAt = new Date(event.timestamp).toLocaleDateString("en-IN", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
          emailData.total = shipment.sub_orders?.total || 0;
        }

        const emailType = newStatus === "delivered" ? "order_delivered" : "shipping_update";

        try {
          await supabase.functions.invoke("send-email", {
            body: { 
              type: emailType, 
              to: customerEmail, 
              data: emailData,
              subject: emailSubjects[newStatus],
            },
          });
          console.log(`${emailType} email sent to ${customerEmail}`);
        } catch (emailErr) {
          console.error("Failed to send email:", emailErr);
        }
      }

      // Send WhatsApp notification
      if (profile?.phone) {
        const templateMap: Record<string, string> = {
          picked_up: "order_shipped",
          in_transit: "order_in_transit",
          out_for_delivery: "out_for_delivery",
          delivered: "order_delivered",
          failed_delivery: "delivery_failed",
        };

        const templateName = templateMap[newStatus];
        if (templateName) {
          try {
            await supabase.functions.invoke("send-whatsapp", {
              body: {
                phone_number: profile.phone,
                template_name: templateName,
                template_params: {
                  customer_name: profile.full_name || "Customer",
                  order_number: order.order_number,
                  courier_name: shipment.courier_name || partner,
                  tracking_number: event.awb,
                  current_location: event.city || event.location || "",
                  tracking_url: `${resolveAppBaseUrl()}/orders/${shipment.sub_orders?.order_id}/tracking`,
                },
                user_id: order.customer_id,
                reference_type: "shipment",
                reference_id: shipment.id,
              },
            });
          } catch (waErr) {
            console.error("WhatsApp notification failed:", waErr);
          }
        }
      }

      // In-app notification
      try {
        await supabase.from("notifications").insert({
          user_id: order.customer_id,
          type: "shipping",
          title: enrichedDescription,
          message: `Order ${order.order_number} — ${event.city || event.location || partner}`,
          data: {
            order_id: shipment.sub_orders?.order_id,
            sub_order_id: shipment.sub_order_id,
            shipment_id: shipment.id,
            status: newStatus,
            awb: event.awb,
          },
        });
      } catch {
        // Non-critical
      }
    }

    // Log activity
    if (shipment.sub_orders?.order_id) {
      await supabase.from("order_activity_log").insert({
        order_id: shipment.sub_orders.order_id,
        sub_order_id: shipment.sub_order_id,
        activity_type: "shipment_update",
        title: `Shipment ${newStatus.replace(/_/g, " ")}`,
        description: `AWB ${event.awb} — ${enrichedDescription}${event.city ? ` (${event.city})` : ""}`,
        actor_type: "system",
      });
    }

    console.log(`Shipment ${event.awb} updated: ${shipment.current_status} → ${newStatus}`);

    return new Response(
      JSON.stringify({ success: true, status: newStatus, previous: shipment.current_status }),
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
