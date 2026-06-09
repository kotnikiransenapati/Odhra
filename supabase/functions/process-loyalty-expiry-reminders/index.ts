import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEADS = [90, 30, 7] as const;

interface LoyaltyRow {
  id: string;
  user_id: string;
  expiring_points: number | null;
  expiry_date: string | null;
}

function daysUntil(dateText: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateText);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const maxDate = new Date(Date.now() + 90 * 86400000).toISOString();
    const { data, error } = await supabase
      .from("loyalty_points")
      .select("id, user_id, expiring_points, expiry_date")
      .gt("expiring_points", 0)
      .not("expiry_date", "is", null)
      .lte("expiry_date", maxDate)
      .limit(500);

    if (error) throw error;

    let inserted = 0;
    let skipped = 0;
    const rows = (data ?? []) as LoyaltyRow[];

    for (const row of rows) {
      if (!row.expiry_date || !row.expiring_points) continue;
      const days = daysUntil(row.expiry_date);
      if (!LEADS.includes(days as typeof LEADS[number])) continue;

      const type = `loyalty_expiry_${days}d`;
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("type", type)
        .contains("data", { loyalty_id: row.id, expiry_date: row.expiry_date })
        .limit(1)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase.from("notifications").insert({
        user_id: row.user_id,
        type,
        title: `${row.expiring_points.toLocaleString("en-IN")} points expire ${days === 7 ? "soon" : `in ${days} days`}`,
        body: "Redeem your rewards before they expire.",
        data: {
          href: "/account/rewards?tab=redeem",
          loyalty_id: row.id,
          expiry_date: row.expiry_date,
          expiring_points: row.expiring_points,
          days_left: days,
        },
      });

      if (insertError) throw insertError;
      inserted++;
    }

    return new Response(JSON.stringify({ processed: rows.length, inserted, skipped }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-loyalty-expiry-reminders failed", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});