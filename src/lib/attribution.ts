import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "lov_anon_id";

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function captureTouchpoint() {
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source") || (document.referrer ? new URL(document.referrer).hostname : null);
    const medium = params.get("utm_medium");
    const campaign = params.get("utm_campaign");
    const content = params.get("utm_content");
    const term = params.get("utm_term");

    // Only record meaningful touchpoints
    if (!source && !campaign) return;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("attribution_touchpoints").insert({
      user_id: user?.id ?? null,
      anonymous_id: user ? null : getAnonId(),
      source: source || "(direct)",
      medium: medium || undefined,
      campaign: campaign || undefined,
      content: content || undefined,
      term: term || undefined,
      referrer: document.referrer || undefined,
      landing_path: window.location.pathname,
    });
  } catch (err) {
    // Silent — attribution should never block UX
    console.debug("[attribution] capture failed", err);
  }
}
