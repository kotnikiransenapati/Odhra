import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * process-reorder-reminders
 * Designed to be invoked by a scheduled cron (e.g. every 15 min).
 * - Selects due reorder_reminders (enabled=true AND next_remind_at<=now())
 * - Inserts an in-app notification per row
 * - Best-effort email via Resend when RESEND_API_KEY is configured
 * - Advances last_reminded_at + next_remind_at by interval_days
 * Idempotent per execution window: rows that fail to send are NOT advanced.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH = 200;

interface ReminderRow {
  id: string;
  user_id: string;
  product_id: string;
  interval_days: number;
  product: { id: string; title: string; slug: string | null } | null;
  user_email?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "Odhra <noreply@odhra.com>";
  const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://odhra1.lovable.app";

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Fetch due reminders
    const { data: due, error } = await supabase
      .from("reorder_reminders")
      .select(
        `id, user_id, product_id, interval_days,
         product:products!reorder_reminders_product_id_fkey(id, title, slug)`
      )
      .eq("enabled", true)
      .lte("next_remind_at", new Date().toISOString())
      .order("next_remind_at", { ascending: true })
      .limit(BATCH);

    if (error) throw error;

    const rows = (due ?? []) as unknown as ReminderRow[];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull user emails in one go
    const uids = [...new Set(rows.map((r) => r.user_id))];
    const emailMap = new Map<string, string>();
    for (const uid of uids) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email) emailMap.set(uid, u.user.email);
    }

    let sent = 0;
    let failed = 0;

    for (const r of rows) {
      try {
        const title = r.product?.title ?? "your product";
        const href = r.product?.slug
          ? `${SITE}/product/${r.product.slug}`
          : `${SITE}/product/${r.product_id}`;

        // 1) In-app notification (always)
        await supabase.from("notifications").insert({
          user_id: r.user_id,
          type: "reorder_reminder",
          title: `Time to reorder ${title}?`,
          message: `Tap to buy again — your last reminder was ${r.interval_days} days ago.`,
          data: { product_id: r.product_id, href, reminder_id: r.id },
        });

        // 2) Email (best-effort)
        const email = emailMap.get(r.user_id);
        if (RESEND_API_KEY && email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: FROM,
              to: [email],
              subject: `Time to reorder ${title}?`,
              html: `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
                <h2 style="margin:0 0 12px">Running low on ${title}?</h2>
                <p style="color:#555;line-height:1.55">It's been ${r.interval_days} days since your last nudge. Tap below to reorder in one click.</p>
                <p style="margin:24px 0"><a href="${href}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reorder now</a></p>
                <p style="font-size:12px;color:#888">Manage or stop these reminders in your Account.</p>
              </div>`,
            }),
          });
        }

        // 3) Advance schedule
        const now = new Date();
        const next = new Date(now.getTime() + r.interval_days * 86400000);
        const { error: upErr } = await supabase
          .from("reorder_reminders")
          .update({
            last_reminded_at: now.toISOString(),
            next_remind_at: next.toISOString(),
          })
          .eq("id", r.id);
        if (upErr) throw upErr;

        sent++;
      } catch (e) {
        failed++;
        console.error("reorder reminder failed", r.id, e);
      }
    }

    return new Response(
      JSON.stringify({ processed: rows.length, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-reorder-reminders fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
