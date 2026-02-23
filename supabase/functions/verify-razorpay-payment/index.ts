import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { resolveAppBaseUrl } from "../_shared/url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
  order_id: z.string().uuid(),
});

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
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

    // Auth: optional (supports guest checkout)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }

    // Parse and validate
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = validatedData;

    console.log(`Verifying payment for order ${order_id}, Razorpay order: ${razorpay_order_id}`);

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
    const data = encoder.encode(body);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const expectedSignature = bufferToHex(signature);

    if (expectedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      await supabase.from("orders").update({ payment_status: "failed", status: "cancelled" }).eq("id", order_id);
      throw new Error("Payment verification failed - signature mismatch");
    }

    console.log("Signature verified successfully");

    // Fetch the order — verify ownership if logged in, otherwise just fetch by ID (guest)
    let orderQuery = supabase.from("orders").select("*").eq("id", order_id);
    if (userId) {
      orderQuery = orderQuery.eq("customer_id", userId);
    }
    const { data: order, error: orderError } = await orderQuery.single();

    if (orderError || !order) {
      throw new Error("Order not found or unauthorized");
    }

    // Update order status
    await supabase.from("orders").update({
      payment_status: "paid",
      status: "confirmed",
      payment_id: razorpay_payment_id,
    }).eq("id", order_id);

    // Update sub-orders to confirmed
    await supabase.from("sub_orders").update({ status: "confirmed" }).eq("order_id", order_id);

    // Update product stock
    const { data: subOrders } = await supabase.from("sub_orders").select("id").eq("order_id", order_id);

    if (subOrders) {
      for (const subOrder of subOrders) {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_id, quantity")
          .eq("sub_order_id", subOrder.id);

        if (orderItems) {
          for (const item of orderItems) {
            const { data: product } = await supabase
              .from("products")
              .select("stock, sold_count")
              .eq("id", item.product_id)
              .single();

            if (product) {
              await supabase.from("products").update({
                stock: Math.max(0, product.stock - item.quantity),
                sold_count: (product.sold_count || 0) + item.quantity,
              }).eq("id", item.product_id);
            }
          }
        }
      }
    }

    // Record promotion usage if applicable
    if (order.promotion_id && order.discount_amount && userId) {
      await supabase.from("promotion_usages").insert({
        promotion_id: order.promotion_id,
        user_id: userId,
        order_id: order.id,
        discount_applied: order.discount_amount,
      }).then(() => supabase.rpc("increment_promotion_usage", { promo_id: order.promotion_id }));
    }

    // Mark reward redemption codes as used
    if (order.promotion_code && userId) {
      const promoCode = order.promotion_code;
      if (promoCode.startsWith("RWD-")) {
        await supabase
          .from("points_redemptions")
          .update({ status: "used", used_at: new Date().toISOString() })
          .eq("reward_code", promoCode)
          .eq("user_id", userId)
          .eq("status", "active");
      }
      if (promoCode.startsWith("SPIN-")) {
        await supabase
          .from("spin_wheel_entries")
          .update({ status: "used", used_at: new Date().toISOString(), order_id: order.id })
          .eq("code", promoCode)
          .eq("user_id", userId)
          .eq("status", "active");
      }
    }

    // Clear user's cart if logged in
    if (userId) {
      await supabase.from("carts").delete().eq("user_id", userId);
    }

    // Award loyalty points if logged in
    if (userId) {
      try {
        const pointsToAward = Math.floor(order.total_amount / 10);
        if (pointsToAward > 0) {
          await supabase.rpc("add_loyalty_points", {
            p_user_id: userId,
            p_points: pointsToAward,
            p_source: "purchase",
            p_description: `Points for order ${order.order_number}`,
            p_reference_id: order.id,
          });
        }

        await supabase.rpc("check_and_award_achievements", { p_user_id: userId }).catch(() => {});

        // Complete pending referrals
        const { data: pendingReferral } = await supabase
          .from("referrals")
          .select("*")
          .eq("referred_id", userId)
          .eq("status", "pending")
          .maybeSingle();

        if (pendingReferral && order.total_amount >= 499) {
          await supabase.from("referrals").update({
            status: "completed",
            qualifying_order_id: order.id,
            completed_at: new Date().toISOString(),
          }).eq("id", pendingReferral.id);

          await supabase.rpc("add_loyalty_points", {
            p_user_id: pendingReferral.referrer_id,
            p_points: pendingReferral.referrer_reward || 100,
            p_source: "referral",
            p_description: "Referral bonus - friend made their first purchase!",
          });

          await supabase.rpc("check_and_award_achievements", { p_user_id: pendingReferral.referrer_id }).catch(() => {});

          const { data: currentCode } = await supabase
            .from("referral_codes")
            .select("successful_referrals, total_earnings")
            .eq("user_id", pendingReferral.referrer_id)
            .single();

          if (currentCode) {
            await supabase.from("referral_codes").update({
              successful_referrals: (currentCode.successful_referrals || 0) + 1,
              total_earnings: (currentCode.total_earnings || 0) + (pendingReferral.referrer_reward || 100),
            }).eq("user_id", pendingReferral.referrer_id);
          }
        }
      } catch (loyaltyError) {
        console.error("Loyalty error (non-critical):", loyaltyError);
      }
    }

    // Send confirmation email
    const emailTo = userId
      ? (await supabase.from("profiles").select("full_name, email").eq("id", userId).single()).data
      : order.guest_email ? { full_name: order.shipping_address?.full_name, email: order.guest_email } : null;

    if (emailTo?.email) {
      try {
        const siteUrl = resolveAppBaseUrl();
        const emailItems: Array<{ title: string; quantity: number; price: number; image?: string }> = [];
        if (subOrders) {
          for (const so of subOrders) {
            const { data: items } = await supabase
              .from("order_items")
              .select("product_title, quantity, unit_price, product_image")
              .eq("sub_order_id", so.id);
            items?.forEach((item) => emailItems.push({
              title: item.product_title, quantity: item.quantity, price: item.unit_price, image: item.product_image || undefined,
            }));
          }
        }

        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({
            type: "order_confirmation",
            to: emailTo.email,
            data: {
              orderNumber: order.order_number,
              customerName: emailTo.full_name || "Customer",
              total: order.total_amount,
              items: emailItems,
              orderId: order.id,
              trackingUrl: `${siteUrl}/order-success/${order.id}`,
            },
          }),
        }).catch(e => console.error("Email send failed:", e));
      } catch (emailError) {
        console.error("Email error (non-critical):", emailError);
      }
    }

    console.log(`Payment verified and order ${order.order_number} confirmed`);

    return new Response(
      JSON.stringify({ success: true, order_number: order.order_number, message: "Payment verified successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in verify-razorpay-payment:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
