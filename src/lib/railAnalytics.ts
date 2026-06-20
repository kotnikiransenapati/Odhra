import { supabase } from "@/integrations/supabase/client";

export type RailEvent = "impression" | "click" | "add_to_cart" | "purchase";

interface TrackArgs {
  railKey: string;
  productId?: string;
  event: RailEvent;
  rankPosition?: number;
  ruleId?: string | null;
  metadata?: Record<string, unknown>;
}

// Debounce impression events per (rail+product) to avoid double-firing.
const sent = new Set<string>();

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem("rail_sid");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("rail_sid", sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

export async function trackRailEvent(args: TrackArgs): Promise<void> {
  const key = `${args.event}:${args.railKey}:${args.productId ?? ""}`;
  if (args.event === "impression" && sent.has(key)) return;
  sent.add(key);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("rail_interactions").insert({
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      rail_key: args.railKey,
      product_id: args.productId ?? null,
      event_type: args.event,
      rank_position: args.rankPosition ?? null,
      rule_id: args.ruleId ?? null,
      metadata: args.metadata ?? {},
    });
  } catch {
    // best-effort analytics; never throw
  }
}
