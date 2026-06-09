import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * process-date-reminders
 * Scheduled cron (daily). For each profile with dates_reminders_enabled=true:
 *  - Looks at birthday_md and anniversary_md (MM-DD strings)
 *  - If the date is 7 days, 1 day, or today (in IST), inserts a notification.
 *  - Dedupes by (user_id, kind, year, lead) so re-runs are idempotent.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH = 500;
const LEAD_DAYS = [7, 1, 0] as const;

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  birthday_md: string | null;
  anniversary_md: string | null;
}

function istToday(): { year: number; mmdd: string } {
  // IST = UTC+5:30
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return { year: now.getUTCFullYear(), mmdd: `${mm}-${dd}` };
}

function addDaysMD(baseMmdd: string, days: number): string {
  const [mm, dd] = baseMmdd.split("-").map(Number);
  const d = new Date(Date.UTC(2024, mm - 1, dd)); // 2024 = leap year, safe
  d.setUTCDate(d.getUTCDate() + days);
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function buildMessage(kind: "birthday" | "anniversary", lead: number): {
  title: string;
  message: string;
} {
  const label = kind === "birthday" ? "birthday" : "anniversary";
  if (lead === 0) {
    return {
      title: `Happy ${label}! 🎉`,
      message: `Treat yourself — use code SPECIAL for an extra reward.`,
    };
  }
  if (lead === 1) {
    return {
      title: `Your ${label} is tomorrow 🎁`,
      message: `Pick a last-minute gift with same-day delivery in select pincodes.`,
    };
  }
  return {
    title: `Your ${label} is in a week 🎂`,
    message: `Browse curated gift ideas and reserve early.`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { year, mmdd: today } = istToday();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, birthday_md, anniversary_md")
      .eq("dates_reminders_enabled", true)
      .or("birthday_md.not.is.null,anniversary_md.not.is.null")
      .limit(BATCH);

    if (error) throw error;

    let inserted = 0;
    let skipped = 0;
    const rows = (profiles ?? []) as ProfileRow[];

    for (const p of rows) {
      const kinds: Array<{ kind: "birthday" | "anniversary"; md: string | null }> = [
        { kind: "birthday", md: p.birthday_md },
        { kind: "anniversary", md: p.anniversary_md },
      ];

      for (const { kind, md } of kinds) {
        if (!md) continue;
        for (const lead of LEAD_DAYS) {
          const target = addDaysMD(today, 0); // today
          const triggerWindow = addDaysMD(md, -lead); // when to send
          if (triggerWindow !== target) continue;

          const { title, message } = buildMessage(kind, lead);
          const idempotencyType = `date_reminder:${kind}:${year}:${lead}`;

          // Dedupe — check existing notification with same type
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", p.id)
            .eq("type", idempotencyType)
            .limit(1)
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }

          const { error: insErr } = await supabase.from("notifications").insert({
            user_id: p.id,
            type: idempotencyType,
            title,
            message,
            link: "/shop?filter=gifts",
            is_read: false,
          });

          if (insErr) {
            console.error("notification insert failed", p.id, kind, insErr.message);
            continue;
          }
          inserted++;
        }
      }
    }

    return new Response(
      JSON.stringify({ processed: rows.length, inserted, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-date-reminders failed", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
