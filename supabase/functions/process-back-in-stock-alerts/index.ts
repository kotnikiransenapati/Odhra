import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DueWaitlistRow {
  waitlist_id: string;
  user_id: string;
  email: string;
  product_id: string;
  title: string;
  slug: string;
  stock: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "Odhra <noreply@odhra.com>";
  const site = Deno.env.get("PUBLIC_SITE_URL") ?? "https://odhra1.lovable.app";
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data, error } = await supabase.rpc("get_due_back_in_stock_waitlist", { _limit: 200 });
    if (error) throw error;

    const rows = (data ?? []) as DueWaitlistRow[];
    let notified = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const href = `${site}/product/${row.slug || row.product_id}`;
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", row.user_id)
          .eq("type", "back_in_stock")
          .contains("data", { waitlist_id: row.waitlist_id })
          .limit(1)
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase.from("notifications").insert({
            user_id: row.user_id,
            type: "back_in_stock",
            title: "Back in stock",
            body: `${row.title} is available again. Stock is limited, so reserve yours soon.`,
            data: {
              href,
              stock: row.stock,
              product_id: row.product_id,
              waitlist_id: row.waitlist_id,
            },
          });
          if (insertError) throw insertError;
        }

        if (resendKey && row.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from,
              to: [row.email],
              subject: `${row.title} is back in stock`,
              html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2>${row.title} is back in stock</h2><p>Only ${row.stock} available right now.</p><p><a href="${href}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700">Buy now</a></p></div>`,
            }),
          });
        }

        const { error: updateError } = await supabase
          .from("product_waitlist")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", row.waitlist_id)
          .is("notified_at", null);
        if (updateError) throw updateError;

        notified++;
      } catch (e) {
        failed++;
        console.error("back-in-stock alert failed", row.waitlist_id, e);
      }
    }

    return new Response(JSON.stringify({ processed: rows.length, notified, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-back-in-stock-alerts failed", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});