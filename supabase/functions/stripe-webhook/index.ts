import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      throw new Error("Stripe credentials not configured");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        const orderNumber = session.metadata?.order_number;

        if (!orderId) {
          console.error("No order_id in session metadata");
          break;
        }

        console.log(`Payment completed for order ${orderNumber}`);

        // Update order status
        const { error: orderError } = await supabase
          .from("orders")
          .update({
            status: "confirmed",
            payment_status: "paid",
            payment_id: session.payment_intent as string,
          })
          .eq("id", orderId);

        if (orderError) {
          console.error("Failed to update order:", orderError);
          throw orderError;
        }

        // Update sub-orders status
        const { error: subOrderError } = await supabase
          .from("sub_orders")
          .update({ status: "confirmed" })
          .eq("order_id", orderId);

        if (subOrderError) {
          console.error("Failed to update sub-orders:", subOrderError);
        }

        // Get sub-orders to credit vendor wallets (escrow)
        const { data: subOrders } = await supabase
          .from("sub_orders")
          .select("id, vendor_id, vendor_earnings")
          .eq("order_id", orderId);

        if (subOrders) {
          for (const subOrder of subOrders) {
            // Add to vendor pending balance (escrow)
            const { data: vendor } = await supabase
              .from("vendors")
              .select("pending_balance")
              .eq("id", subOrder.vendor_id)
              .single();

            await supabase
              .from("vendors")
              .update({
                pending_balance: (vendor?.pending_balance || 0) + subOrder.vendor_earnings,
              })
              .eq("id", subOrder.vendor_id);

            // Record wallet transaction
            await supabase.from("wallet_transactions").insert({
              vendor_id: subOrder.vendor_id,
              type: "sale",
              amount: subOrder.vendor_earnings,
              balance_after: (vendor?.pending_balance || 0) + subOrder.vendor_earnings,
              reference_type: "sub_order",
              reference_id: subOrder.id,
              description: `Earnings from order (pending release)`,
            });
          }
        }

        console.log(`Order ${orderNumber} confirmed and vendor wallets updated`);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;

        if (orderId) {
          await supabase
            .from("orders")
            .update({
              status: "cancelled",
              payment_status: "failed",
            })
            .eq("id", orderId);

          await supabase
            .from("sub_orders")
            .update({ status: "cancelled" })
            .eq("order_id", orderId);

          console.log(`Order ${orderId} cancelled due to expired checkout`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed for intent: ${paymentIntent.id}`);
        
        // Find and update order by payment_id
        const { error } = await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("payment_id", paymentIntent.id);

        if (error) console.error("Failed to update order:", error);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        // Find order and process refund
        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("payment_id", paymentIntentId)
          .single();

        if (order) {
          await supabase
            .from("orders")
            .update({
              status: "refunded",
              payment_status: "refunded",
            })
            .eq("id", order.id);

          await supabase
            .from("sub_orders")
            .update({ status: "refunded" })
            .eq("order_id", order.id);

          console.log(`Order refunded: ${order.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe webhook error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
