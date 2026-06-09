import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityKind = "order" | "loyalty" | "session" | "review";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  occurred_at: string;
  title: string;
  subtitle?: string;
  amount?: number | null;
  href?: string;
}

/** Unified read-only activity feed merging orders, loyalty, and sessions. */
export function useAccountActivity(limit = 15) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["account-activity", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;

      const [orders, loyalty, sessions] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, total_amount, created_at")
          .eq("customer_id", uid)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("loyalty_transactions")
          .select("id, points, transaction_type, description, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("user_sessions")
          .select("id, device_info, last_active_at, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const items: ActivityItem[] = [];

      (orders.data ?? []).forEach((o) => {
        items.push({
          id: `order-${o.id}`,
          kind: "order",
          occurred_at: o.created_at,
          title: `Order #${o.order_number}`,
          subtitle: o.status.replace(/_/g, " "),
          amount: Number(o.total_amount),
          href: `/account/orders/${o.id}`,
        });
      });

      (loyalty.data ?? []).forEach((l) => {
        const earned = (l.transaction_type ?? "").toLowerCase() === "earned";
        items.push({
          id: `loyalty-${l.id}`,
          kind: "loyalty",
          occurred_at: l.created_at,
          title: `${earned ? "+" : "-"}${Math.abs(l.points)} pts ${earned ? "earned" : "redeemed"}`,
          subtitle: l.description ?? l.transaction_type ?? undefined,
          href: "/account/rewards",
        });
      });

      (sessions.data ?? []).forEach((s) => {
        const di = (s.device_info ?? {}) as { browser?: string; os?: string; device?: string };
        items.push({
          id: `session-${s.id}`,
          kind: "session",
          occurred_at: s.created_at,
          title: `Signed in on ${di.device ?? "device"}`,
          subtitle: [di.browser, di.os].filter(Boolean).join(" • ") || undefined,
          href: "/settings?tab=security",
        });
      });

      items.sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));
      return items.slice(0, limit);
    },
  });
}
