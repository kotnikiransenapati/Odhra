import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
  order_id: z.string().uuid(),
});

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

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    // Parse and validate request body with Zod
    let validatedData;
    try {
      const body = await req.json();
      validatedData = VerifyPaymentSchema.parse(body);
    } catch (parseError) {
      if (parseError instanceof z.ZodError) {
        const errorMessages = parseError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
      throw parseError;
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      order_id 
    } = validatedData;

    console.log(`Verifying payment for order ${order_id}, Razorpay order: ${razorpay_order_id}`);

    // Verify signature using Web Crypto API
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
    const data = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const expectedSignature = bufferToHex(signature);

    if (expectedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      
      // Update order as failed
      await supabase
        .from("orders")
        .update({ 
          payment_status: "failed",
          status: "cancelled"
        })
        .eq("id", order_id);

      throw new Error("Payment verification failed - signature mismatch");
    }

    console.log("Signature verified successfully");

    // Verify order belongs to user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("customer_id", user.id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found or unauthorized");
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
        payment_id: razorpay_payment_id,
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw updateError;
    }

    // Update all sub-orders to confirmed
    const { error: subOrderUpdateError } = await supabase
      .from("sub_orders")
      .update({ status: "confirmed" })
      .eq("order_id", order_id);

    if (subOrderUpdateError) {
      console.error("Error updating sub-orders:", subOrderUpdateError);
    }

    // Update product stock
    const { data: subOrders } = await supabase
      .from("sub_orders")
      .select("id")
      .eq("order_id", order_id);

    if (subOrders) {
      for (const subOrder of subOrders) {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_id, quantity")
          .eq("sub_order_id", subOrder.id);

        if (orderItems) {
          for (const item of orderItems) {
            // Decrement stock
            const { data: product } = await supabase
              .from("products")
              .select("stock, sold_count")
              .eq("id", item.product_id)
              .single();

            if (product) {
              await supabase
                .from("products")
                .update({
                  stock: Math.max(0, product.stock - item.quantity),
                  sold_count: (product.sold_count || 0) + item.quantity,
                })
                .eq("id", item.product_id);
            }
          }
        }
      }
    }

    // Record promotion usage if applicable
    if (order.promotion_id && order.discount_amount) {
      const { error: promoUsageError } = await supabase
        .from("promotion_usages")
        .insert({
          promotion_id: order.promotion_id,
          user_id: user.id,
          order_id: order.id,
          discount_applied: order.discount_amount,
        });

      if (promoUsageError) {
        console.error("Error recording promotion usage:", promoUsageError);
      } else {
        // Increment promotion usage count
        await supabase.rpc("increment_promotion_usage", { promo_id: order.promotion_id });
      }
    }

    // Clear user's cart
    await supabase.from("carts").delete().eq("user_id", user.id);

    // Send order confirmation email
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    if (profile?.email) {
      try {
        const siteUrl = Deno.env.get("SITE_URL") || "https://odhra.lovable.app";
        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: "order_confirmation",
            to: profile.email,
            data: {
              orderNumber: order.order_number,
              customerName: profile.full_name || "Customer",
              total: order.total_amount,
              trackingUrl: `${siteUrl}/account/orders/${order.id}`,
            },
          }),
        });
        console.log("Order confirmation email sent");
      } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError);
        // Don't throw - email failure shouldn't fail the order
      }
    }

    console.log(`Payment verified and order ${order.order_number} confirmed`);

    return new Response(
      JSON.stringify({
        success: true,
        order_number: order.order_number,
        message: "Payment verified successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in verify-razorpay-payment:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});