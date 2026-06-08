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
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const siteUrl = resolveAppBaseUrl();

    // Load feature flags (master kill switches)
    const { data: flagRows } = await supabase
      .from("feature_flags")
      .select("feature_key, is_enabled")
      .in("feature_key", ["cart_abandonment_emails", "whatsapp_cart_recovery", "cart_recovery_ab_testing"]);

    const flags = new Map<string, boolean>((flagRows || []).map((r: any) => [r.feature_key, r.is_enabled]));
    const emailsFlagEnabled = flags.get("cart_abandonment_emails") ?? true;
    const whatsappFlagEnabled = flags.get("whatsapp_cart_recovery") ?? true;
    const abTestFlagEnabled = flags.get("cart_recovery_ab_testing") ?? true;

    if (!emailsFlagEnabled) {
      return new Response(
        JSON.stringify({ success: true, message: "Cart abandonment emails disabled by feature flag", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch active A/B test (only if A/B testing flag enabled)
    const { data: abTest } = abTestFlagEnabled
      ? await supabase
          .from("cart_recovery_ab_tests")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle()
      : { data: null } as any;

    // Fetch unrecovered events
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
    let whatsappSent = 0;
    let emailsFailed = 0;
    let skipped = 0;
    const results: Array<{ eventId: string; status: string; step?: number; channel?: string }> = [];

    for (const event of events) {
      const currentStep = (event as any).email_step || 0;
      const nextStepConfig = EMAIL_STEPS[currentStep];
      if (!nextStepConfig) { skipped++; continue; }

      const referenceTime = (event as any).last_email_at
        ? new Date((event as any).last_email_at)
        : new Date(event.created_at);
      const hoursElapsed = (now.getTime() - referenceTime.getTime()) / (1000 * 60 * 60);

      if (hoursElapsed < nextStepConfig.delayHours) { skipped++; continue; }

      // Auto-recovery detection
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id, total_amount")
        .eq("customer_id", event.user_id)
        .gt("created_at", event.created_at)
        .in("payment_status", ["paid", "cod_pending"])
        .limit(1);

      if (recentOrders && recentOrders.length > 0) {
        await supabase
          .from("cart_abandonment_events")
          .update({ 
            recovered: true,
            recovered_at: now.toISOString(),
            recovered_revenue: recentOrders[0].total_amount || 0,
            recovery_channel: 'organic',
          } as any)
          .eq("id", event.id);
        results.push({ eventId: event.id, status: "auto_recovered" });
        continue;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, phone")
        .eq("id", event.user_id)
        .single();

      if (!profile?.email) { skipped++; continue; }

      // Check email preferences
      const { data: emailPrefs } = await supabase
        .from("email_preferences")
        .select("abandoned_cart_reminders")
        .eq("user_id", event.user_id)
        .single();

      if (emailPrefs && emailPrefs.abandoned_cart_reminders === false) { skipped++; continue; }

      const cartItems = (event.cart_snapshot as unknown as CartItem[]) || [];
      if (cartItems.length === 0) { skipped++; continue; }

      // Enrich items
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

      const cartTotal = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Get dynamic discount using DB function
      const { data: discountData } = await supabase.rpc("get_cart_recovery_discount", {
        p_user_id: event.user_id,
        p_cart_value: cartTotal,
        p_email_step: nextStepConfig.step,
      });

      const discount = discountData as { discount_type: string; discount_value: number; discount_code: string; rule_id?: string; user_segment?: string } | null;
      const hasDiscount = discount && discount.discount_type !== 'none' && discount.discount_value > 0;

      // A/B test variant assignment
      let abVariant: string | null = null;
      let abSubjectOverride: string | null = null;
      if (abTest) {
        const rand = Math.random() * 100;
        abVariant = rand < abTest.traffic_split ? 'a' : 'b';
        const variantData = abVariant === 'a' ? abTest.variant_a : abTest.variant_b;
        if (variantData && (variantData as any).subject) {
          abSubjectOverride = (variantData as any).subject;
        }
      }

      // Generate recovery code
      const recoveryCode = crypto.randomUUID().slice(0, 8).toUpperCase();

      // Campaign link
      let campaignCode: string | null = null;
      try {
        const { data: codeData } = await supabase.rpc("generate_campaign_code");
        if (codeData) {
          campaignCode = codeData as string;
          await supabase.from("campaign_links").insert({
            code: campaignCode,
            campaign_type: "cart_recovery",
            campaign_name: `Cart Recovery - ${profile.full_name || profile.email} - Step ${nextStepConfig.step}`,
            target_path: `/cart?recovery=${recoveryCode}&channel=email`,
            created_by: null,
            metadata: {
              abandonment_event_id: event.id,
              user_id: event.user_id,
              email_step: nextStepConfig.step,
              cart_value: cartTotal,
              ab_variant: abVariant,
              discount_code: hasDiscount ? discount!.discount_code : null,
            },
            personalization: {
              heading: nextStepConfig.step === 3 ? "🔥 Last Chance!" : "🛒 Your Cart Awaits",
              cta: "Complete Purchase",
            },
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      } catch (e) {
        console.error("Campaign link creation error:", e);
      }

      const recoveryUrl = campaignCode
        ? `${siteUrl}/c/${campaignCode}`
        : buildAppUrl(siteUrl, "/cart", { recovery: recoveryCode, channel: "email" });

      const formatPrice = (amount: number) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

      const emailSubject = abSubjectOverride || nextStepConfig.subject;

      const emailHtml = buildEmailHtml({
        customerName: profile.full_name || "there",
        items: enrichedItems,
        cartTotal,
        formatPrice,
        urgency: nextStepConfig.urgency,
        step: nextStepConfig.step,
        recoveryUrl,
        siteUrl,
        discount: hasDiscount ? { type: discount!.discount_type, value: discount!.discount_value, code: discount!.discount_code } : null,
      });

      // Send email
      let emailSentOk = false;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Odhra <onboarding@resend.dev>",
            to: [profile.email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });
        if (res.ok) {
          emailSentOk = true;
          emailsSent++;
        } else {
          console.error(`Resend error [${res.status}]:`, await res.text());
          emailsFailed++;
        }
      } catch (e) {
        console.error("Resend send error:", e);
        emailsFailed++;
      }

      // Send WhatsApp recovery (parallel channel)
      let whatsappOk = false;
      if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID && (profile as any).phone && nextStepConfig.step >= 2) {
        try {
          const waRecoveryUrl = campaignCode
            ? `${siteUrl}/c/${campaignCode}`.replace('channel=email', 'channel=whatsapp')
            : buildAppUrl(siteUrl, "/cart", { recovery: recoveryCode, channel: "whatsapp" });

          // Check WhatsApp preferences
          const { data: waPrefs } = await supabase
            .from("whatsapp_preferences")
            .select("promotional_messages")
            .eq("user_id", event.user_id)
            .single();

          if (!waPrefs || waPrefs.promotional_messages !== false) {
            const formattedPhone = (profile as any).phone.startsWith("+") ? (profile as any).phone.slice(1) : (profile as any).phone;
            const waRes = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`, {
              method: "POST",
              headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: formattedPhone,
                type: "template",
                template: {
                  name: "cart_recovery",
                  language: { code: "en" },
                  components: [{
                    type: "body",
                    parameters: [
                      { type: "text", text: profile.full_name || "there" },
                      { type: "text", text: `${enrichedItems.length} items` },
                      { type: "text", text: formatPrice(cartTotal) },
                      { type: "text", text: hasDiscount ? `Use code ${discount!.discount_code} for ${discount!.discount_value}% off!` : "Complete your order now!" },
                    ],
                  }],
                },
              }),
            });
            if (waRes.ok) {
              whatsappOk = true;
              whatsappSent++;
            }
          }
        } catch (e) {
          console.error("WhatsApp recovery error:", e);
        }
      }

      // Update event
      if (emailSentOk || whatsappOk) {
        const updatePayload: any = {
          email_sent: true,
          email_sent_at: event.email_sent_at || now.toISOString(),
          email_step: nextStepConfig.step,
          last_email_at: now.toISOString(),
          recovery_url: recoveryUrl,
          recovery_code: recoveryCode,
          ...(hasDiscount ? {
            recovery_discount_code: discount!.discount_code,
            recovery_discount_value: discount!.discount_value,
          } : {}),
          ...(abVariant ? { ab_test_id: abTest?.id, ab_variant: abVariant } : {}),
          ...(whatsappOk ? { whatsapp_sent: true, whatsapp_sent_at: now.toISOString() } : {}),
        };

        await supabase.from("cart_abandonment_events").update(updatePayload).eq("id", event.id);

        // Update A/B test counters
        if (abTest && abVariant) {
          const field = abVariant === 'a' ? 'total_sent_a' : 'total_sent_b';
          await supabase.rpc("increment_field" as any, { table_name: "cart_recovery_ab_tests", row_id: abTest.id, field_name: field });
        }

        // Update discount rule usage
        if (hasDiscount && discount!.rule_id) {
          await supabase
            .from("cart_recovery_discount_rules")
            .update({ times_used: (await supabase.from("cart_recovery_discount_rules").select("times_used").eq("id", discount!.rule_id).single()).data?.times_used + 1 || 1 } as any)
            .eq("id", discount!.rule_id);
        }

        results.push({ eventId: event.id, status: "sent", step: nextStepConfig.step, channel: whatsappOk ? "email+whatsapp" : "email" });
      } else {
        results.push({ eventId: event.id, status: "failed", step: nextStepConfig.step });
      }
    }

    console.log(`Cart abandonment: ${events.length} events, ${emailsSent} emails, ${whatsappSent} whatsapp, ${emailsFailed} failed, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, processed: events.length, emailsSent, whatsappSent, emailsFailed, skipped, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Cart abandonment error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
  discount: { type: string; value: number; code: string } | null;
}) {
  const { customerName, items, cartTotal, formatPrice, urgency, step, recoveryUrl, siteUrl, discount } = opts;

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

  // Dynamic discount section (replaces hardcoded COMEBACK10)
  const incentive = discount
    ? `<div style="background:#f0fdf4;border:2px dashed #22c55e;padding:16px;border-radius:8px;text-align:center;margin:24px 0;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#166534;">
          🎁 Use code <span style="font-family:monospace;background:#dcfce7;padding:4px 8px;border-radius:4px;">${discount.code}</span> for ${discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`} off!
        </p>
        <p style="margin:4px 0 0;font-size:13px;color:#15803d;">Exclusive to you • Valid for 24 hours only</p>
      </div>`
    : "";

  // Savings callout
  const savingsLine = discount && discount.type === 'percentage'
    ? `<p style="text-align:center;color:#166534;font-weight:600;font-size:16px;">💰 You save ${formatPrice(cartTotal * discount.value / 100)} with this code!</p>`
    : discount && discount.type === 'fixed'
    ? `<p style="text-align:center;color:#166534;font-weight:600;font-size:16px;">💰 You save ${formatPrice(discount.value)} with this code!</p>`
    : "";

  const itemsHtml = items.slice(0, 4).map((item) => `
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
    </tr>`).join("");

  const moreItems = items.length > 4
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
    ${savingsLine}
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
