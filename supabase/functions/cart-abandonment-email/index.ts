import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  product_id: string;
  quantity: number;
  title?: string;
  price?: number;
  image_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Cart abandonment email scheduler triggered");

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find carts that haven't been updated in 24 hours and belong to logged-in users
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // For testing, we can also use a shorter window (e.g., 1 hour)
    // const oneHourAgo = new Date();
    // oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    console.log(`Looking for abandoned carts older than: ${twentyFourHoursAgo.toISOString()}`);

    const { data: abandonedCarts, error: cartsError } = await supabase
      .from("carts")
      .select("*")
      .not("user_id", "is", null)
      .lt("updated_at", twentyFourHoursAgo.toISOString());

    if (cartsError) {
      console.error("Error fetching abandoned carts:", cartsError);
      throw cartsError;
    }

    console.log(`Found ${abandonedCarts?.length || 0} abandoned carts`);

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No abandoned carts found",
          processed: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const cart of abandonedCarts) {
      const cartItems = (cart.items as unknown as CartItem[]) || [];
      
      if (cartItems.length === 0) {
        console.log(`Cart ${cart.id} is empty, skipping`);
        continue;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", cart.user_id)
        .single();

      if (profileError || !profile?.email) {
        console.log(`Could not find email for user ${cart.user_id}, skipping`);
        continue;
      }

      // Enrich cart items with product data
      const productIds = cartItems.map((item) => item.product_id);
      const { data: products } = await supabase
        .from("products")
        .select(`
          id, title, price,
          product_images (url, is_primary)
        `)
        .in("id", productIds);

      const enrichedItems = cartItems.map((item) => {
        const product = products?.find((p) => p.id === item.product_id);
        const primaryImage = product?.product_images?.find((img: { is_primary: boolean }) => img.is_primary);
        return {
          ...item,
          title: product?.title || "Product",
          price: product?.price || 0,
          image_url: primaryImage?.url || "",
        };
      });

      // Calculate cart total
      const cartTotal = enrichedItems.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      const formatPrice = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amount);
      };

      // Generate items HTML
      const itemsHtml = enrichedItems.slice(0, 3).map((item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />` : ''}
              <div>
                <p style="margin: 0; font-weight: 500;">${item.title}</p>
                <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Qty: ${item.quantity}</p>
              </div>
            </div>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">
            ${formatPrice(item.price * item.quantity)}
          </td>
        </tr>
      `).join("");

      const moreItemsText = enrichedItems.length > 3 
        ? `<p style="text-align: center; color: #666; font-size: 14px;">+ ${enrichedItems.length - 3} more items in your cart</p>` 
        : "";

      const siteUrl = Deno.env.get("SITE_URL") || "https://odhra.lovable.app";

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Odhra</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">✨ You left something behind!</p>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
              <h2 style="margin: 0 0 8px; color: #1a1a1a;">Hey ${profile.full_name || 'there'}! 👋</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                We noticed you left some amazing items in your cart. Don't let them slip away – they're waiting just for you!
              </p>

              <!-- Cart Items -->
              <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <thead>
                  <tr style="background-color: #f9f9f9;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #1a1a1a;">Items in your cart</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #1a1a1a;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              ${moreItemsText}

              <!-- Total -->
              <div style="background-color: #f9f9f9; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 16px; font-weight: 600;">Cart Total:</span>
                  <span style="font-size: 24px; font-weight: 700; color: #8B5CF6;">${formatPrice(cartTotal)}</span>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${siteUrl}/cart" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #ffffff; padding: 16px 48px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Complete Your Purchase
                </a>
              </div>

              <!-- Benefits -->
              <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                  <strong>Why shop with us?</strong><br>
                  ✅ Free shipping on orders over ₹999<br>
                  ✅ Easy 7-day returns<br>
                  ✅ Secure payment options
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
                Need help? <a href="${siteUrl}/contact" style="color: #8B5CF6; text-decoration: none;">Contact us</a>
              </p>
              <p style="margin: 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} Odhra. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email using the send-email function
      try {
        const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: "cart_abandonment",
            to: profile.email,
            data: {
              customerName: profile.full_name || "there",
              cartTotal: formatPrice(cartTotal),
              itemCount: enrichedItems.length,
              cartUrl: `${siteUrl}/cart`,
            },
            customHtml: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          console.log(`Cart abandonment email sent to ${profile.email}`);
          emailsSent++;
        } else {
          const errorText = await emailResponse.text();
          console.error(`Failed to send email to ${profile.email}:`, errorText);
          emailsFailed++;
        }
      } catch (emailError) {
        console.error(`Error sending email to ${profile.email}:`, emailError);
        emailsFailed++;
      }
    }

    console.log(`Cart abandonment emails: ${emailsSent} sent, ${emailsFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${abandonedCarts.length} abandoned carts`,
        emailsSent,
        emailsFailed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in cart-abandonment-email:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
