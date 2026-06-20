import { supabase } from "@/integrations/supabase/client";

export type MerchAction = "pin" | "boost" | "bury" | "hide";
export type MerchScope = "global" | "category" | "collection" | "search" | "vendor" | "segment";

export interface MerchandisingRule {
  id: string;
  name: string;
  description: string | null;
  scope_type: MerchScope;
  scope_value: string | null;
  action: MerchAction;
  product_ids: string[];
  weight: number;
  conditions: Record<string, unknown>;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
}

export async function fetchActiveRules(scope: MerchScope, value?: string | null) {
  let q = supabase
    .from("merchandising_rules")
    .select("*")
    .eq("is_active", true)
    .eq("scope_type", scope)
    .order("priority", { ascending: true });
  if (value !== undefined) q = q.eq("scope_value", value as any);
  const { data, error } = await q;
  if (error) throw error;
  const now = Date.now();
  return ((data ?? []) as unknown as MerchandisingRule[]).filter((r) => {
    if (r.starts_at && new Date(r.starts_at).getTime() > now) return false;
    if (r.ends_at && new Date(r.ends_at).getTime() < now) return false;
    return true;
  });
}

/** Apply pin/boost/bury/hide to an ordered list of product IDs. */
export function applyMerchandising<T extends { id: string }>(
  items: T[],
  rules: MerchandisingRule[],
): T[] {
  const byId = new Map(items.map((p) => [p.id, p]));
  const hidden = new Set<string>();
  const buried = new Map<string, number>();
  const boosted = new Map<string, number>();
  const pinned: string[] = [];

  for (const r of rules) {
    for (const pid of r.product_ids ?? []) {
      if (r.action === "hide") hidden.add(pid);
      else if (r.action === "bury") buried.set(pid, (buried.get(pid) ?? 0) + r.weight);
      else if (r.action === "boost") boosted.set(pid, (boosted.get(pid) ?? 0) + r.weight);
      else if (r.action === "pin" && !pinned.includes(pid)) pinned.push(pid);
    }
  }

  const remaining = items.filter((p) => !hidden.has(p.id) && !pinned.includes(p.id));
  remaining.sort((a, b) => {
    const sa = (boosted.get(a.id) ?? 0) - (buried.get(a.id) ?? 0);
    const sb = (boosted.get(b.id) ?? 0) - (buried.get(b.id) ?? 0);
    return sb - sa;
  });

  const pinnedItems = pinned.map((id) => byId.get(id)).filter(Boolean) as T[];
  return [...pinnedItems, ...remaining];
}
