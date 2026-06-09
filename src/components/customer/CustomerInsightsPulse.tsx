import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Truck, Gift, Sparkles, ShoppingBag, RotateCcw, Trophy, ArrowUpRight,
  CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";

type Sev = "critical" | "warning" | "info" | "success";

interface Insight {
  id: string;
  severity: Sev;
  icon: typeof Truck;
  title: string;
  body: string;
  cta?: { label: string; href: string };
}

const sevStyles: Record<Sev, string> = {
  critical: "border-destructive/30 bg-destructive/5 text-destructive",
  warning:  "border-warning/30 bg-warning/5 text-warning",
  info:     "border-info/30 bg-info/5 text-info",
  success:  "border-success/30 bg-success/5 text-success",
};
const sevRank: Record<Sev, number> = { critical: 0, warning: 1, info: 2, success: 3 };

const TIER_THRESH: Record<string, number> = {
  bronze: 0, silver: 500, gold: 2000, platinum: 5000, diamond: 10000,
};
const TIER_NEXT: Record<string, string | null> = {
  bronze: "silver", silver: "gold", gold: "platinum", platinum: "diamond", diamond: null,
};

export function CustomerInsightsPulse() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const now = new Date();
        const soon = new Date(now.getTime() + 14 * 86_400_000).toISOString();

        const results: any[] = await Promise.all([
          supabase.from("orders")
            .select("id, order_number, status, shipping_address")
            .eq("customer_id", user.id)
            .in("status", ["confirmed", "processing", "shipped"])
            .order("created_at", { ascending: false }).limit(1),
          supabase.from("loyalty_points")
            .select("points, lifetime_points, tier, expiring_points, expiry_date")
            .eq("user_id", user.id).maybeSingle(),
          supabase.from("loyalty_points")
            .select("expiring_points, expiry_date")
            .eq("user_id", user.id)
            .gt("expiring_points", 0)
            .lt("expiry_date", soon).maybeSingle(),
          supabase.from("carts").select("id, updated_at").eq("user_id", user.id).maybeSingle(),
          supabase.from("return_requests")
            .select("id, status").eq("customer_id", user.id)
            .in("status", ["pending", "approved", "in_transit"]).limit(3),
          supabase.from("share_rewards")
            .select("id, status").eq("user_id", user.id)
            .eq("status", "available").limit(3),
        ]);
        const inflight = results[0]?.data as any[] | null;
        const loyalty = results[1]?.data as any;
        const expiringPts = results[2]?.data as any;
        const cart = results[3]?.data as any;
        const pendingReturns = results[4]?.data as any[] | null;
        const rewards = results[5]?.data as any[] | null;

        const list: Insight[] = [];

        if (inflight && inflight.length > 0) {
          const o: any = inflight[0];
          list.push({
            id: "order",
            severity: o.status === "shipped" ? "info" : "warning",
            icon: Truck,
            title: o.status === "shipped" ? "Your order is on the way" : "Order in progress",
            body: `${o.order_number} — ${o.status}. Track real-time delivery updates.`,
            cta: { label: "Track order", href: `/orders/${o.id}/track` },
          });
        }

        const lp: any = loyalty || {};
        if (expiringPts && (expiringPts as any).expiring_points > 0) {
          const e: any = expiringPts;
          const days = Math.max(0, Math.ceil((new Date(e.expiry_date).getTime() - now.getTime()) / 86_400_000));
          list.push({
            id: "exp_pts",
            severity: days <= 7 ? "critical" : "warning",
            icon: Gift,
            title: `${e.expiring_points} points expire in ${days}d`,
            body: "Redeem them at checkout before they vanish.",
            cta: { label: "Redeem now", href: "/account/rewards" },
          });
        }

        const tier = lp.tier || "bronze";
        const nextTier = TIER_NEXT[tier];
        if (nextTier) {
          const needed = Math.max(0, (TIER_THRESH[nextTier] || 0) - (lp.lifetime_points || 0));
          if (needed > 0 && needed <= 500) {
            list.push({
              id: "tier",
              severity: "info",
              icon: Trophy,
              title: `${needed} pts to ${nextTier} tier`,
              body: "You're close to your next tier and bigger rewards.",
              cta: { label: "Shop now", href: "/" },
            });
          }
        }

        if (cart && cart.updated_at) {
          const stale = Date.now() - new Date(cart.updated_at).getTime() > 3 * 86_400_000;
          if (stale) {
            list.push({
              id: "cart",
              severity: "warning",
              icon: ShoppingBag,
              title: "You left items in your cart",
              body: "Finish checkout before items go out of stock.",
              cta: { label: "Resume cart", href: "/cart" },
            });
          }
        }

        if (pendingReturns && pendingReturns.length > 0) {
          list.push({
            id: "returns",
            severity: "info",
            icon: RotateCcw,
            title: `${pendingReturns.length} return(s) in progress`,
            body: "Track refund status and pickup updates.",
            cta: { label: "View returns", href: "/account/returns" },
          });
        }

        if (rewards && rewards.length > 0) {
          list.push({
            id: "rewards",
            severity: "success",
            icon: Sparkles,
            title: `${rewards.length} unclaimed reward(s)`,
            body: "Share rewards are ready to apply at checkout.",
            cta: { label: "Claim", href: "/account/rewards" },
          });
        }

        if (list.length === 0) {
          list.push({
            id: "allgood",
            severity: "success",
            icon: CheckCircle2,
            title: "You're all caught up",
            body: "No pending actions. Keep shopping to earn more points.",
            cta: { label: "Explore", href: "/" },
          });
        }
        list.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
        if (!cancelled) setInsights(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0, success: 0 };
    insights.forEach(i => c[i.severity]++);
    return c;
  }, [insights]);

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Your Pulse
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs">
            {counts.critical > 0 && <Badge variant="destructive">{counts.critical} urgent</Badge>}
            {counts.warning > 0 && <Badge className="bg-warning/15 text-warning border-warning/30">{counts.warning} to do</Badge>}
            {counts.critical + counts.warning === 0 && (
              <Badge className="bg-success/15 text-success border-success/30">All caught up</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((it, idx) => (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, type: "spring", stiffness: 400, damping: 30 }}
                className={`rounded-xl border p-4 flex items-start gap-3 ${sevStyles[it.severity]}`}
              >
                <div className="w-9 h-9 rounded-lg bg-background/60 flex items-center justify-center shrink-0">
                  <it.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground leading-tight">{it.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{it.body}</p>
                  {it.cta && (
                    <Button asChild size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1">
                      <Link to={it.cta.href}>{it.cta.label}<ArrowUpRight className="w-3 h-3" /></Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CustomerInsightsPulse;
