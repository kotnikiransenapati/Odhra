import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveAppBaseUrl } from "../_shared/url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find products below their low_stock_threshold
    const { data: lowStockProducts, error } = await supabase
      .from("products")
      .select("id, title, sku, stock, low_stock_threshold, vendor_id, vendors(brand_name, user_id)")
      .eq("is_active", true);

    if (error) throw error;

    const alertsToCreate: any[] = [];
    const vendorNotifications: Record<string, Array<{ title: string; stock: number }>> = {};

    for (const product of lowStockProducts || []) {
      const threshold = product.low_stock_threshold || 10;
      if (product.stock > threshold) continue;

      // Check if unresolved alert already exists
      const { data: existing } = await supabase
        .from("inventory_alerts")
        .select("id")
        .eq("product_id", product.id)
        .eq("is_resolved", false)
        .maybeSingle();

      if (!existing) {
        alertsToCreate.push({
          product_id: product.id,
          vendor_id: product.vendor_id,
          alert_type: product.stock === 0 ? "out_of_stock" : "low_stock",
          threshold,
          current_stock: product.stock,
        });

        // Group by vendor for notifications
        const vendorUserId = (product as any).vendors?.user_id;
        if (vendorUserId) {
          if (!vendorNotifications[vendorUserId]) vendorNotifications[vendorUserId] = [];
          vendorNotifications[vendorUserId].push({ title: product.title, stock: product.stock });
        }
      }
    }

    // Bulk insert alerts
    if (alertsToCreate.length > 0) {
      const { error: insertError } = await supabase.from("inventory_alerts").insert(alertsToCreate);
      if (insertError) console.error("Alert insert error:", insertError);
    }

    // Create in-app notifications for vendors
    for (const [userId, products] of Object.entries(vendorNotifications)) {
      const productList = products.slice(0, 3).map(p => `${p.title} (${p.stock} left)`).join(", ");
      const suffix = products.length > 3 ? ` and ${products.length - 3} more` : "";

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "⚠️ Low Stock Alert",
        message: `${products.length} product(s) need restocking: ${productList}${suffix}`,
        type: "inventory",
        action_url: "/vendor/products",
      });
    }

    // Also send email notifications to vendors with RESEND
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      for (const [userId, products] of Object.entries(vendorNotifications)) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profile?.email) {
          const itemList = products.map(p =>
            `<li><strong>${p.title}</strong> — ${p.stock === 0 ? '<span style="color:red">Out of Stock</span>' : `${p.stock} units remaining`}</li>`
          ).join("");

          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "Odhra Alerts <alerts@resend.dev>",
                to: [profile.email],
                subject: `⚠️ ${products.length} product(s) need restocking`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Inventory Alert</h2>
                    <p>Hi ${profile.full_name || 'there'},</p>
                    <p>The following products are running low on stock:</p>
                    <ul>${itemList}</ul>
                    <p><a href="${resolveAppBaseUrl()}/vendor/products" style="display: inline-block; padding: 10px 20px; background: #c9a96e; color: white; text-decoration: none; border-radius: 8px;">Manage Inventory</a></p>
                    <p style="color: #888; font-size: 12px;">— Odhra Marketplace</p>
                  </div>
                `,
              }),
            });
          } catch (emailErr) {
            console.error("Email error for vendor:", userId, emailErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: alertsToCreate.length,
        vendors_notified: Object.keys(vendorNotifications).length,
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
