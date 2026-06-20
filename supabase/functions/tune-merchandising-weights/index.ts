import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Auto-tune merchandising_rules.weight based on per-rule CTR over a window.
// Strategy: target CTR = global mean CTR. weight_new = clamp(weight_cur * (1 + α*(ctr - target)/target), 0.1, 5).
// Dry-run by default; persist when {apply:true}.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Admin gate
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number(body.days) || 7, 1), 90);
    const alpha = Math.min(Math.max(Number(body.alpha) || 0.4, 0.05), 1.0);
    const apply = !!body.apply;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ctrRows, error } = await service.rpc("rail_ctr_summary", { _days: days });
    if (error) throw error;

    // Aggregate per rule: sum impressions/clicks, compute ctr
    const byRule = new Map<string, { impressions: number; clicks: number }>();
    let totalImpressions = 0, totalClicks = 0;
    for (const r of ctrRows ?? []) {
      totalImpressions += Number(r.impressions);
      totalClicks += Number(r.clicks);
      if (!r.rule_id) continue;
      const cur = byRule.get(r.rule_id) ?? { impressions: 0, clicks: 0 };
      cur.impressions += Number(r.impressions);
      cur.clicks += Number(r.clicks);
      byRule.set(r.rule_id, cur);
    }
    const targetCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0.05;

    const ruleIds = [...byRule.keys()];
    const { data: rules } = await service
      .from("merchandising_rules")
      .select("id, name, weight, action, is_active")
      .in("id", ruleIds.length ? ruleIds : ["00000000-0000-0000-0000-000000000000"]);

    const proposals: any[] = [];
    for (const rule of rules ?? []) {
      const stats = byRule.get(rule.id)!;
      if (stats.impressions < 50) continue; // need signal
      const ctr = stats.clicks / stats.impressions;
      const adj = 1 + alpha * ((ctr - targetCtr) / Math.max(targetCtr, 0.001));
      const newWeight = Math.round(Math.max(0.1, Math.min(5, Number(rule.weight) * adj)) * 100) / 100;
      if (Math.abs(newWeight - Number(rule.weight)) < 0.05) continue;
      proposals.push({
        rule_id: rule.id,
        name: rule.name,
        action: rule.action,
        impressions: stats.impressions,
        clicks: stats.clicks,
        ctr: Math.round(ctr * 10000) / 10000,
        weight_current: Number(rule.weight),
        weight_proposed: newWeight,
      });
    }

    if (apply && proposals.length) {
      for (const p of proposals) {
        await service.from("merchandising_rules").update({ weight: p.weight_proposed }).eq("id", p.rule_id);
      }
      await service.from("audit_logs").insert({
        actor_id: user.id,
        action: "merchandising.auto_tune",
        resource_type: "merchandising_rules",
        metadata: { proposals, days, alpha, target_ctr: targetCtr },
      } as any).catch(() => {});
    }

    return json({ target_ctr: targetCtr, total_impressions: totalImpressions, proposals, applied: apply });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
