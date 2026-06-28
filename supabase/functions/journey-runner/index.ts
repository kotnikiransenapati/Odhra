// Lifecycle Journey runner — processes due enrollments and advances them.
// Designed to be invoked by pg_cron / scheduler every 5 minutes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_LIMIT = 200;

interface Step {
  id: string;
  step_order: number;
  action_type: string;
  action_config: Record<string, any>;
  wait_hours: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "missing_env" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1. Refresh dynamic segments (cheap & idempotent)
  try { await supabase.rpc("refresh_customer_segments"); } catch (_) { /* non-fatal */ }

  // 2. Auto-enroll for segment_entry journeys
  const { data: segJourneys } = await supabase
    .from("lifecycle_journeys")
    .select("id, trigger_config")
    .eq("status", "active")
    .eq("trigger_type", "segment_entry");

  for (const j of segJourneys ?? []) {
    const segmentId = (j.trigger_config as any)?.segment_id;
    if (!segmentId) continue;
    const { data: members } = await supabase
      .from("customer_segment_members")
      .select("user_id")
      .eq("segment_id", segmentId)
      .limit(500);
    for (const m of members ?? []) {
      await supabase.rpc("enroll_user_in_journey", {
        _journey_id: j.id, _user_id: m.user_id, _context: { source: "segment" },
      });
    }
  }

  // 3. Advance due enrollments
  const { data: due, error: dueErr } = await supabase
    .from("journey_enrollments")
    .select("id, journey_id, user_id, current_step, context")
    .eq("status", "active")
    .lte("next_run_at", new Date().toISOString())
    .limit(BATCH_LIMIT);

  if (dueErr) {
    return new Response(JSON.stringify({ error: dueErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0, completed = 0, failed = 0;

  for (const e of due ?? []) {
    const { data: steps } = await supabase
      .from("journey_steps")
      .select("id, step_order, action_type, action_config, wait_hours")
      .eq("journey_id", e.journey_id)
      .order("step_order", { ascending: true });

    const ordered: Step[] = (steps ?? []) as any;
    const next = ordered.find((s) => s.step_order >= e.current_step);

    if (!next) {
      await supabase.from("journey_enrollments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", e.id);
      completed++; continue;
    }

    let status: "success" | "skipped" | "failed" = "success";
    const detail: Record<string, any> = { action: next.action_type };

    try {
      switch (next.action_type) {
        case "wait":
          /* nothing to do — wait_hours below */
          break;
        case "send_email": {
          const body = {
            to_user_id: e.user_id,
            subject: next.action_config.subject ?? "A message for you",
            html: next.action_config.html ?? "<p>Hello</p>",
            template: next.action_config.template,
          };
          const { error } = await supabase.functions.invoke("send-email", { body });
          if (error) { status = "failed"; detail.error = error.message; }
          break;
        }
        case "send_notification": {
          await supabase.from("notifications").insert({
            user_id: e.user_id,
            title: next.action_config.title ?? "Update",
            message: next.action_config.message ?? "",
            type: next.action_config.type ?? "info",
          });
          break;
        }
        case "grant_discount": {
          const code = `J-${e.id.slice(0, 6).toUpperCase()}-${next.step_order}`;
          await supabase.from("discount_codes").insert({
            code,
            description: `Journey reward (step ${next.step_order})`,
            discount_type: next.action_config.discount_type ?? "percentage",
            discount_value: next.action_config.discount_value ?? 10,
            max_uses: 1, used_count: 0,
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 14 * 86400_000).toISOString(),
            is_active: true,
            assigned_to_user_id: e.user_id,
          } as any);
          detail.code = code;
          break;
        }
        case "tag_segment": {
          const segmentId = next.action_config.segment_id;
          if (segmentId) {
            await supabase.from("customer_segment_members")
              .insert({ segment_id: segmentId, user_id: e.user_id })
              .select();
          } else { status = "skipped"; }
          break;
        }
        case "webhook": {
          const target = next.action_config.url;
          if (target) {
            const r = await fetch(target, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: e.user_id, context: e.context }),
            });
            detail.http_status = r.status;
            if (!r.ok) status = "failed";
          } else { status = "skipped"; }
          break;
        }
        default:
          status = "skipped";
      }
    } catch (err: any) {
      status = "failed";
      detail.error = err?.message ?? String(err);
    }

    await supabase.from("journey_events").insert({
      enrollment_id: e.id,
      step_order: next.step_order,
      action_type: next.action_type,
      status, detail,
    });

    const nextRun = new Date(Date.now() + (next.wait_hours || 0) * 3600_000).toISOString();
    await supabase.from("journey_enrollments")
      .update({
        current_step: next.step_order + 1,
        next_run_at: nextRun,
        status: status === "failed" ? "failed" : "active",
      })
      .eq("id", e.id);

    processed++;
    if (status === "failed") failed++;
  }

  return new Response(JSON.stringify({ processed, completed, failed }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
