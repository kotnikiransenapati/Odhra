import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveAppBaseUrl } from "../_shared/url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Run forecast computation
    const { data: forecastResult, error: forecastError } = await supabase.rpc(
      "compute_inventory_forecasts",
      { p_period_days: 30 }
    );
    if (forecastError) console.error("Forecast computation error:", forecastError);

    // Step 2: Find products below threshold
    const { data: products, error } = await supabase
      .from("products")
      .select("id, title, sku, stock, low_stock_threshold, reorder_point, avg_daily_sales, days_until_stockout, vendor_id, vendors(brand_name, user_id)")
      .eq("is_active", true);

    if (error) throw error;

    const alertsToCreate: any[] = [];
    const vendorNotifications: Record<string, Array<{ title: string; stock: number; days_left: number | null; reorder_qty: number }>> = {};

    for (const product of products || []) {
      const threshold = product.reorder_point || product.low_stock_threshold || 10;
      if (product.stock > threshold) continue;

      // Check if unresolved alert already exists
      const { data: existing } = await supabase
        .from("inventory_alerts")
        .select("id")
        .eq("product_id", product.id)
        .eq("is_resolved", false)
        .maybeSingle();

      if (!existing) {
        const alertType = product.stock === 0 
          ? "out_of_stock" 
          : (product.days_until_stockout !== null && product.days_until_stockout <= 3) 
            ? "critical_stockout" 
            : "low_stock";

        alertsToCreate.push({
          product_id: product.id,
          vendor_id: product.vendor_id,
          alert_type: alertType,
          threshold,
          current_stock: product.stock,
        });

        // Group by vendor
        const vendorUserId = (product as any).vendors?.user_id;
        if (vendorUserId) {
          if (!vendorNotifications[vendorUserId]) vendorNotifications[vendorUserId] = [];
          vendorNotifications[vendorUserId].push({
            title: product.title,
            stock: product.stock,
            days_left: product.days_until_stockout,
            reorder_qty: product.reorder_quantity || 50,
          });
        }
      }
    }

    // Bulk insert alerts
    if (alertsToCreate.length > 0) {
      const { error: insertError } = await supabase.from("inventory_alerts").insert(alertsToCreate);
      if (insertError) console.error("Alert insert error:", insertError);
    }

    // Create in-app notifications for vendors with forecast data
    for (const [userId, items] of Object.entries(vendorNotifications)) {
      const urgentItems = items.filter(i => i.days_left !== null && i.days_left <= 7);
      const productList = items.slice(0, 3).map(p => {
        const daysInfo = p.days_left !== null ? ` (${p.days_left}d left)` : '';
        return `${p.title}: ${p.stock} units${daysInfo}`;
      }).join(", ");
      const suffix = items.length > 3 ? ` and ${items.length - 3} more` : "";

      const urgencyPrefix = urgentItems.length > 0 ? "🔴 URGENT: " : "⚠️ ";

      await supabase.from("notifications").insert({
        user_id: userId,
        title: `${urgencyPrefix}${items.length} product(s) need restocking`,
        message: `${productList}${suffix}`,
        type: "inventory",
        action_url: "/vendor/products",
      });
    }

    // Send email notifications via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      for (const [userId, items] of Object.entries(vendorNotifications)) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profile?.email) {
          const urgentItems = items.filter(i => i.days_left !== null && i.days_left <= 7);

          const itemList = items.map(p => {
            const stockLabel = p.stock === 0
              ? '<span style="color:#ef4444;font-weight:bold">Out of Stock</span>'
              : `${p.stock} units remaining`;
            const daysLabel = p.days_left !== null
              ? ` · <span style="color:${p.days_left <= 3 ? '#ef4444' : '#f59e0b'}">${p.days_left} days until stockout</span>`
              : '';
            return `<li style="margin-bottom:8px"><strong>${p.title}</strong> — ${stockLabel}${daysLabel}<br/><span style="color:#888;font-size:12px">Suggested reorder: ${p.reorder_qty} units</span></li>`;
          }).join("");

          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "Odhra Alerts <alerts@resend.dev>",
                to: [profile.email],
                subject: urgentItems.length > 0
                  ? `🔴 URGENT: ${urgentItems.length} product(s) running out soon`
                  : `⚠️ ${items.length} product(s) need restocking`,
                html: `
                  <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; padding: 24px;">
                    <h2 style="color: #111; margin-bottom: 8px;">Inventory Alert</h2>
                    <p style="color: #555;">Hi ${profile.full_name || 'there'},</p>
                    ${urgentItems.length > 0 ? '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:16px 0"><strong style="color:#ef4444">⚡ ' + urgentItems.length + ' product(s) will stock out within 7 days!</strong></div>' : ''}
                    <p style="color: #555;">The following products need attention:</p>
                    <ul style="padding-left: 16px; color: #333;">${itemList}</ul>
                    <div style="margin-top: 24px;">
                      <a href="${resolveAppBaseUrl()}/vendor/products" style="display: inline-block; padding: 12px 24px; background: #c9a96e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Manage Inventory →</a>
                    </div>
                    <p style="color: #aaa; font-size: 12px; margin-top: 24px;">— Odhra Marketplace</p>
                  </div>
                `,
              }),
            });
          } catch (emailErr) {
            console.error("Email error:", emailErr);
          }
        }
      }
    }

    // Notify admins of critical stockouts
    const criticalProducts = (products || []).filter(
      (p: any) => p.stock === 0 || (p.days_until_stockout !== null && p.days_until_stockout <= 3)
    );

    if (criticalProducts.length > 0) {
      // Get admin user IDs
      const { data: adminUsers } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("is_active", true);

      if (adminUsers) {
        const adminNotifications = adminUsers.map((au: any) => ({
          user_id: au.user_id,
          title: `🔴 ${criticalProducts.length} product(s) critically low`,
          message: `${criticalProducts.slice(0, 3).map((p: any) => p.title).join(', ')}${criticalProducts.length > 3 ? ` +${criticalProducts.length - 3} more` : ''}`,
          type: "inventory",
          action_url: "/admin?tab=inventory",
        }));

        await supabase.from("notifications").insert(adminNotifications);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecasts_computed: forecastResult?.products_updated || 0,
        alerts_created: alertsToCreate.length,
        vendors_notified: Object.keys(vendorNotifications).length,
        critical_products: criticalProducts.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Inventory alert error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
