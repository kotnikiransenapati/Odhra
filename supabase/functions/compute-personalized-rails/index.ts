import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull recent behavior signals
    const [{ data: viewed }, { data: profile }, { data: trending }] = await Promise.all([
      supabase.from("recently_viewed_products").select("product_id").eq("user_id", user.id).order("viewed_at", { ascending: false }).limit(20),
      supabase.from("user_behavior_profiles").select("top_categories, engagement_score").eq("user_id", user.id).maybeSingle(),
      supabase.from("products").select("id, category_id, view_count").eq("is_active", true).order("view_count", { ascending: false }).limit(40),
    ]);

    const viewedIds = (viewed ?? []).map((v: any) => v.product_id);
    const topCats: string[] = (profile?.top_categories as any) ?? [];

    // 1) "For You" - based on viewed categories
    let forYou: string[] = [];
    if (viewedIds.length) {
      const { data: catProducts } = await supabase
        .from("products").select("id, category_id").in("id", viewedIds);
      const cats = [...new Set((catProducts ?? []).map((p: any) => p.category_id).filter(Boolean))];
      if (cats.length) {
        const { data: recs } = await supabase
          .from("products").select("id").in("category_id", cats)
          .eq("is_active", true).not("id", "in", `(${viewedIds.join(",") || "''"})`)
          .order("view_count", { ascending: false }).limit(12);
        forYou = (recs ?? []).map((r: any) => r.id);
      }
    }

    // 2) "Trending" - most viewed
    const trendingIds = (trending ?? []).slice(0, 12).map((p: any) => p.id);

    // 3) "Continue Browsing" - recently viewed
    const continueIds = viewedIds.slice(0, 12);

    // Apply merchandising rules (boosts/buries)
    const { data: rules } = await supabase
      .from("merchandising_rules")
      .select("action, product_ids, weight, scope_type")
      .eq("is_active", true)
      .eq("scope_type", "global");

    const applyRules = (ids: string[]) => {
      if (!rules?.length) return ids;
      const buried = new Set<string>();
      const pinned: string[] = [];
      for (const r of rules) {
        if (r.action === "bury" || r.action === "hide") (r.product_ids ?? []).forEach((id: string) => buried.add(id));
        if (r.action === "pin") pinned.push(...(r.product_ids ?? []));
      }
      const filtered = ids.filter((id) => !buried.has(id));
      return [...new Set([...pinned, ...filtered])].slice(0, 12);
    };

    const rails = [
      { rail_key: "for_you", title: "Picked For You", product_ids: applyRules(forYou), score: topCats.length ? 0.9 : 0.5, algorithm: "category-affinity" },
      { rail_key: "trending", title: "Trending Now", product_ids: applyRules(trendingIds), score: 0.7, algorithm: "popularity" },
      { rail_key: "continue", title: "Continue Browsing", product_ids: continueIds, score: viewedIds.length ? 0.8 : 0, algorithm: "recency" },
    ].filter((r) => r.product_ids.length > 0);

    // Upsert
    for (const rail of rails) {
      await supabase.from("personalization_rails").upsert({
        user_id: user.id,
        rail_key: rail.rail_key,
        title: rail.title,
        product_ids: rail.product_ids,
        score: rail.score,
        algorithm: rail.algorithm,
        metadata: { signals: { viewed: viewedIds.length, topCats: topCats.length } },
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "user_id,rail_key" });
    }

    return new Response(JSON.stringify({ rails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
