// GMA4: Send-time dispatcher — processes scheduled_sends due now
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: due, error } = await supabase
    .from("scheduled_sends")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0, failed = 0;
  for (const item of due ?? []) {
    try {
      const fnName = item.channel === "email" ? "send-email"
        : item.channel === "push" ? "send-push-notification"
        : item.channel === "whatsapp" ? "send-whatsapp"
        : null;

      if (fnName) {
        const { error: invokeErr } = await supabase.functions.invoke(fnName, {
          body: { ...item.payload, userId: item.user_id },
        });
        if (invokeErr) throw invokeErr;
      } else {
        // In-app notification
        await supabase.from("notifications").insert({
          user_id: item.user_id,
          title: item.payload?.title ?? "Notification",
          message: item.payload?.message ?? "",
          type: item.payload?.type ?? "info",
        });
      }

      await supabase.from("scheduled_sends").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        attempts: (item.attempts ?? 0) + 1,
      }).eq("id", item.id);
      processed++;
    } catch (err) {
      failed++;
      const attempts = (item.attempts ?? 0) + 1;
      await supabase.from("scheduled_sends").update({
        status: attempts >= 3 ? "failed" : "pending",
        attempts,
        last_error: String((err as Error).message ?? err).slice(0, 500),
      }).eq("id", item.id);
    }
  }

  return new Response(JSON.stringify({ processed, failed, total: due?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
