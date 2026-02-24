import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveAppBaseUrl, buildAppUrl } from "../_shared/url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  product_id: string;
  quantity: number;
  title?: string;
  price?: number;
  image_url?: string;
}

// Multi-step email sequences with escalating urgency
const EMAIL_STEPS = [
  { step: 1, delayHours: 1, subject: "You left something behind! 🛒", urgency: "gentle" },
  { step: 2, delayHours: 24, subject: "Your cart is waiting — items selling fast ⚡", urgency: "moderate" },
  { step: 3, delayHours: 72, subject: "Last chance! Your cart expires soon 🔥", urgency: "urgent" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const siteUrl = resolveAppBaseUrl();

    // Fetch all unrecovered abandonment events eligible for next email step
    const { data: events, error: eventsError } = await supabase
      .from("cart_abandonment_events")
      .select("*")
      .eq("recovered", false)
      .or("email_step.is.null,email_step.lt.3")
      .order("created_at", { ascending: true });

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No eligible events", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    let emailsSent = 0;
    let emailsFailed = 0;
    let skipped = 0;
    const results: Array<{ eventId: string; status: string; step?: number }> = [];

    for (const event of events) {
      const currentStep = event.email_step || 0;
      const nextStepConfig = EMAIL_STEPS[currentStep];
      if (!nextStepConfig) { skipped++; continue; }

      // Check if enough time has passed for the next step
      const referenceTime = event.last_email_at
        ? new Date(event.last_email_at)
        : new Date(event.created_at);
      const hoursElapsed = (now.getTime() - referenceTime.getTime()) / (1000 * 60 * 60);

      if (hoursElapsed < nextStepConfig.delayHours) {
        skipped++;
        continue;
      }

      // Check if user has since placed an order (auto-recovery detection)
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("customer_id", event.user_id)
        .gt("created_at", event.created_at)
        .in("payment_status", ["paid", "cod_pending"])
        .limit(1);

      if (recentOrders && recentOrders.length > 0) {
        await supabase
          .from("cart_abandonment_events")
          .update({ recovered: true })
          .eq("id", event.id);
        results.push({ eventId: event.id, status: "auto_recovered" });
        continue;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", event.user_id)
        .single();

      if (!profile?.email) { skipped++; continue; }

      // Check email preferences
      const { data: emailPrefs } = await supabase
        .from("email_preferences")
        .select("abandoned_cart_reminders")
        .eq("user_id", event.user_id)
        .single();

      if (emailPrefs && emailPrefs.abandoned_cart_reminders === false) {
        skipped++;
        continue;
      }

      const cartItems = (event.cart_snapshot as unknown as CartItem[]) || [];
      if (cartItems.length === 0) { skipped++; continue; }

      // Enrich cart items with current product data
      const productIds = cartItems.map((item) => item.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, title, price, stock, product_images(url, is_primary)")
        .in("id", productIds);

      const enrichedItems = cartItems.map((item) => {
        const product = products?.find((p) => p.id === item.product_id);
        const primaryImage = product?.product_images?.find((img: any) => img.is_primary);
        return {
          ...item,
          title: product?.title || item.title || "Product",
          price: product?.price || item.price || 0,
          image_url: primaryImage?.url || item.image_url || "",
          stock: product?.stock ?? 999,
          in_stock: (product?.stock ?? 999) > 0,
        };
      });

      // Generate recovery code and trackable campaign link
      const recoveryCode = crypto.randomUUID().slice(0, 8).toUpperCase();

      // Create a campaign link for tracking
      let campaignCode: string | null = null;
      try {
        const { data: codeData } = await supabase.rpc("generate_campaign_code");
        if (codeData) {
          campaignCode = codeData as string;
          await supabase.from("campaign_links").insert({
            code: campaignCode,
            campaign_type: "cart_recovery",
            campaign_name: `Cart Recovery - ${profile.full_name || profile.email} - Step ${nextStepConfig.step}`,
            target_path: `/cart?recovery=${recoveryCode}`,
            created_by: null,
            metadata: { 
              abandonment_event_id: event.id,
              user_id: event.user_id,
              email_step: nextStepConfig.step,
              cart_value: enrichedItems.reduce((s, i) => s + i.price * i.quantity, 0),
            },
            personalization: {
              heading: nextStepConfig.step === 3 ? "🔥 Last Chance!" : "🛒 Your Cart Awaits",
              cta: "Complete Purchase",
            },
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      } catch (e) {
        console.error("Campaign link creation error (non-fatal):", e);
      }

      // Build recovery URL - use campaign link if available, otherwise direct
      const recoveryUrl = campaignCode 
        ? `${siteUrl}/c/${campaignCode}`
        : buildAppUrl(siteUrl, "/cart", { recovery: recoveryCode });

      const cartTotal = enrichedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const formatPrice = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amount);

      // Build urgency-specific email
      const emailHtml = buildEmailHtml({
        customerName: profile.full_name || "there",
        items: enrichedItems,
        cartTotal,
        formatPrice,
        urgency: nextStepConfig.urgency,
        step: nextStepConfig.step,
        recoveryUrl,
        siteUrl,
      });

      // Send via Resend
      let sent = false;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Odhra <onboarding@resend.dev>",
            to: [profile.email],
            subject: nextStepConfig.subject,
            html: emailHtml,
          }),
        });
        
        if (res.ok) {
          sent = true;
          const resData = await res.json();
          console.log(`Email sent to ${profile.email} (step ${nextStepConfig.step}):`, resData?.id);
        } else {
          const errText = await res.text();
          console.error(`Resend error for ${profile.email} [${res.status}]:`, errText);
        }
      } catch (e) {
        console.error("Resend send error:", e);
      }

      if (sent) {
        emailsSent++;
        await supabase
          .from("cart_abandonment_events")
          .update({
            email_sent: true,
            email_sent_at: event.email_sent_at || now.toISOString(),
            email_step: nextStepConfig.step,
            last_email_at: now.toISOString(),
            recovery_url: recoveryUrl,
            recovery_code: recoveryCode,
          })
          .eq("id", event.id);
        results.push({ eventId: event.id, status: "sent", step: nextStepConfig.step });
      } else {
        emailsFailed++;
        results.push({ eventId: event.id, status: "failed", step: nextStepConfig.step });
      }
    }

    console.log(`Cart abandonment processed: ${events.length} events, ${emailsSent} sent, ${emailsFailed} failed, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: events.length,
        emailsSent,
        emailsFailed,
        skipped,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Cart abandonment error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- Email HTML Builder ---
function buildEmailHtml(opts: {
  customerName: string;
  items: any[];
  cartTotal: number;
  formatPrice: (n: number) => string;
  urgency: string;
  step: number;
  recoveryUrl: string;
  siteUrl: string;
}) {
  const { customerName, items, cartTotal, formatPrice, urgency, step, recoveryUrl, siteUrl } = opts;

  const urgencyBanner =
    urgency === "urgent"
      ? `<div style="background:#ef4444;color:#fff;padding:12px;text-align:center;font-weight:600;">⚠️ Your cart items may sell out — complete your order now!</div>`
      : urgency === "moderate"
      ? `<div style="background:#f59e0b;color:#fff;padding:12px;text-align:center;font-weight:600;">⚡ These items are popular — don't miss out!</div>`
      : "";

  const lowStockWarnings = items
    .filter((item) => item.stock <= 5 && item.in_stock)
    .map((item) => `<p style="color:#ef4444;font-size:13px;margin:2px 0;">⚠️ Only ${item.stock} left: ${item.title}</p>`)
    .join("");

  const incentive =
    step >= 2
      ? `<div style="background:#f0fdf4;border:2px dashed #22c55e;padding:16px;border-radius:8px;text-align:center;margin:24px 0;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#166534;">🎁 Use code COMEBACK10 for 10% off!</p>
          <p style="margin:4px 0 0;font-size:13px;color:#15803d;">Valid for the next 24 hours only</p>
        </div>`
      : "";

  const itemsHtml = items
    .slice(0, 4)
    .map(
      (item) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" />` : ""}
          <div>
            <p style="margin:0;font-weight:500;">${item.title}</p>
            <p style="margin:4px 0 0;color:#666;font-size:14px;">Qty: ${item.quantity}</p>
            ${!item.in_stock ? '<p style="margin:2px 0 0;color:#ef4444;font-size:12px;font-weight:600;">Out of stock</p>' : ""}
          </div>
        </div>
      </td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>`
    )
    .join("");

  const moreItems =
    items.length > 4
      ? `<p style="text-align:center;color:#666;font-size:14px;">+ ${items.length - 4} more items</p>`
      : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background-color:#f5f5f5;">
<div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
  ${urgencyBanner}
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:28px;letter-spacing:2px;">✨ ODHRA</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px;">Your cart misses you!</p>
  </div>
  <div style="padding:32px;">
    <h2 style="margin:0 0 8px;color:#1a1a1a;">Hey ${customerName}! 👋</h2>
    <p style="color:#666;font-size:16px;line-height:1.6;">
      ${urgency === "urgent"
        ? "This is your last reminder — your cart items are in high demand and may not be available much longer."
        : urgency === "moderate"
        ? "Your selected items are going fast! Complete your purchase before they're gone."
        : "We noticed you left some amazing items in your cart. They're waiting just for you!"}
    </p>
    ${lowStockWarnings ? `<div style="background:#fef2f2;padding:12px;border-radius:8px;margin:16px 0;">${lowStockWarnings}</div>` : ""}
    ${incentive}
    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead><tr style="background-color:#f9f9f9;">
        <th style="padding:12px;text-align:left;font-weight:600;">Items in your cart</th>
        <th style="padding:12px;text-align:right;font-weight:600;">Price</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    ${moreItems}
    <div style="background-color:#f9f9f9;padding:16px;border-radius:8px;margin:24px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:16px;font-weight:600;">Cart Total:</span>
        <span style="font-size:24px;font-weight:700;color:#1a1a2e;">${formatPrice(cartTotal)}</span>
      </div>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${recoveryUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#ffffff;padding:16px 48px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
        Complete Your Purchase →
      </a>
    </div>
    <div style="background-color:#f0fdf4;padding:16px;border-radius:8px;border-left:4px solid #22c55e;">
      <p style="margin:0;color:#166534;font-size:14px;">
        <strong>Why shop with us?</strong><br>
        ✅ Free shipping on orders over ₹1,000<br>
        ✅ Easy 7-day returns<br>
        ✅ Secure payment options<br>
        ✅ Earn loyalty points on every purchase
      </p>
    </div>
  </div>
  <div style="background-color:#f9f9f9;padding:24px;text-align:center;border-top:1px solid #eee;">
    <p style="margin:0 0 8px;color:#666;font-size:14px;">
      Need help? <a href="${siteUrl}/contact" style="color:#1a1a2e;text-decoration:none;">Contact us</a>
    </p>
    <p style="margin:0;color:#999;font-size:12px;">
      © ${new Date().getFullYear()} Odhra. All rights reserved. |
      <a href="${siteUrl}/customer/email-preferences" style="color:#999;">Unsubscribe</a>
    </p>
  </div>
</div>
</body></html>`;
}
