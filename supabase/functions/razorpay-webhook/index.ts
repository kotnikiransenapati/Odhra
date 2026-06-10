import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { claimWebhookEvent, markWebhookProcessed } from "../_shared/webhookIdempotency.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

// Helper function to convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get signature from header
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      console.error("Missing Razorpay signature");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
    const data = encoder.encode(rawBody);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const expectedSignature = bufferToHex(signatureBuffer);

    if (expectedSignature !== signature) {
      console.error("Webhook signature verification failed");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const eventId: string =
      req.headers.get("x-razorpay-event-id") ||
      payload?.payload?.payment?.entity?.id ||
      payload?.payload?.refund?.entity?.id ||
      `${event}:${payload?.created_at ?? Date.now()}`;

    // Idempotency: short-circuit duplicate Razorpay retries.
    const { duplicate } = await claimWebhookEvent(supabase, "razorpay", eventId, event, payload);
    if (duplicate) {
      console.log(`Razorpay webhook duplicate skipped: ${event} (${eventId})`);
      return new Response(JSON.stringify({ status: "duplicate" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Received Razorpay webhook event: ${event} (${eventId})`);

    switch (event) {
      case "payment.captured": {
        const payment = payload.payload.payment.entity;
        const razorpay_order_id = payment.order_id;
        const razorpay_payment_id = payment.id;

        console.log(`Payment captured: ${razorpay_payment_id} for order ${razorpay_order_id}`);

        // Find order by Razorpay order ID
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("id, order_number")
          .eq("payment_id", razorpay_order_id)
          .single();

        if (orderError || !order) {
          console.error("Order not found for Razorpay order:", razorpay_order_id);
          break;
        }

        // Update order status
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "confirmed",
            payment_id: razorpay_payment_id,
          })
          .eq("id", order.id);

        // Update sub-orders
        await supabase
          .from("sub_orders")
          .update({ status: "confirmed" })
          .eq("order_id", order.id);

        console.log(`Order ${order.order_number} marked as paid via webhook`);
        break;
      }

      case "payment.failed": {
        const payment = payload.payload.payment.entity;
        const razorpay_order_id = payment.order_id;

        console.log(`Payment failed for order ${razorpay_order_id}`);

        // Find and update order
        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("payment_id", razorpay_order_id)
          .single();

        if (order) {
          await supabase
            .from("orders")
            .update({
              payment_status: "failed",
              status: "cancelled",
            })
            .eq("id", order.id);

          await supabase
            .from("sub_orders")
            .update({ status: "cancelled" })
            .eq("order_id", order.id);
        }
        break;
      }

      case "refund.created": {
        const refund = payload.payload.refund.entity;
        const razorpay_payment_id = refund.payment_id;

        console.log(`Refund created for payment ${razorpay_payment_id}`);

        // Find order by payment ID and update status
        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("payment_id", razorpay_payment_id)
          .single();

        if (order) {
          await supabase
            .from("orders")
            .update({ payment_status: "refunded" })
            .eq("id", order.id);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in razorpay-webhook:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
