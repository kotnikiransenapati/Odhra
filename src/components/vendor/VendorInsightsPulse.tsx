import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorImpersonation } from "@/contexts/VendorImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, Clock, Package, TrendingDown, TrendingUp, Wallet,
  ShieldAlert, ArrowUpRight, Sparkles, CheckCircle2,
} from "lucide-react";

type Severity = "critical" | "warning" | "info" | "success";

interface Insight {
  id: string;
  severity: Severity;
  icon: typeof AlertTriangle;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  metric?: string;
}

const severityStyles: Record<Severity, string> = {
  critical: "border-destructive/30 bg-destructive/5 text-destructive",
  warning:  "border-warning/30 bg-warning/5 text-warning",
  info:     "border-info/30 bg-info/5 text-info",
  success:  "border-success/30 bg-success/5 text-success",
};

const severityRank: Record<Severity, number> = {
  critical: 0, warning: 1, info: 2, success: 3,
};

export function VendorInsightsPulse() {
  const { user } = useAuth();
  const { impersonatedVendor, isImpersonating } = useVendorImpersonation();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const impersonatedId = isImpersonating ? impersonatedVendor?.id : null;

  useEffect(() => {
    if (!user?.id && !impersonatedId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let vendor: { id: string; kyc_status: string | null; is_active: boolean | null } | null = null;
        if (impersonatedId) {
          const { data } = await supabase.from("vendors").select("id, kyc_status, is_active").eq("id", impersonatedId).maybeSingle();
          vendor = data as any;
        } else {
          const { data } = await supabase.from("vendors").select("id, kyc_status, is_active").eq("user_id", user!.id).maybeSingle();
          vendor = data as any;
        }

        if (!vendor) { setInsights([]); setLoading(false); return; }

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString();

        const [
          { count: pendingShip },
          { count: overdueShip },
          { data: thisWeek },
          { data: lastWeek },
          { count: lowStock },
          { data: payouts },
          { count: openDisputes },
        ] = await Promise.all([
          supabase.from("sub_orders").select("id", { count: "exact", head: true })
            .eq("vendor_id", vendor.id).in("status", ["pending", "confirmed", "processing"]),
          supabase.from("sub_orders").select("id", { count: "exact", head: true })
            .eq("vendor_id", vendor.id).in("status", ["pending", "confirmed", "processing"])
            .lt("created_at", new Date(now.getTime() - 2 * 86_400_000).toISOString()),
          supabase.from("sub_orders").select("total_amount")
            .eq("vendor_id", vendor.id).gte("created_at", weekAgo),
          supabase.from("sub_orders").select("total_amount")
            .eq("vendor_id", vendor.id).gte("created_at", twoWeeksAgo).lt("created_at", weekAgo),
          supabase.from("products").select("id", { count: "exact", head: true })
            .eq("vendor_id", vendor.id).lt("stock", 10).eq("is_active", true),
          supabase.from("payout_requests").select("amount, status")
            .eq("vendor_id", vendor.id).in("status", ["pending", "processing"]),
          supabase.from("disputes").select("id", { count: "exact", head: true })
            .eq("vendor_id", vendor.id).in("status", ["open", "investigating"]),
        ]);

        const sum = (rows: any[] | null) =>
          (rows || []).reduce((a, r) => a + Number(r.total_amount || 0), 0);
        const wkNow = sum(thisWeek);
        const wkPrev = sum(lastWeek);
        const delta = wkPrev > 0 ? ((wkNow - wkPrev) / wkPrev) * 100 : (wkNow > 0 ? 100 : 0);

        const list: Insight[] = [];

        if (vendor.kyc_status !== "verified") {
          list.push({
            id: "kyc",
            severity: "critical",
            icon: ShieldAlert,
            title: "KYC verification required",
            body: "Complete your KYC to unlock payouts and full storefront visibility.",
            cta: { label: "Complete KYC", href: "/vendor/settings?tab=kyc" },
          });
        }
        if ((overdueShip || 0) > 0) {
          list.push({
            id: "overdue",
            severity: "critical",
            icon: AlertTriangle,
            title: `${overdueShip} order(s) overdue to ship`,
            body: "Orders sitting unfulfilled > 48 hours hurt your seller score.",
            metric: `${overdueShip}`,
            cta: { label: "Fulfill now", href: "/vendor/orders" },
          });
        }
        if ((pendingShip || 0) > 0 && (overdueShip || 0) === 0) {
          list.push({
            id: "pending",
            severity: "warning",
            icon: Clock,
            title: `${pendingShip} pending fulfillment`,
            body: "Ship within 48h to keep your on-time rate high.",
            metric: `${pendingShip}`,
            cta: { label: "Open orders", href: "/vendor/orders" },
          });
        }
        if ((lowStock || 0) > 0) {
          list.push({
            id: "lowstock",
            severity: "warning",
            icon: Package,
            title: `${lowStock} product(s) low on stock`,
            body: "Restock before you start losing impressions.",
            metric: `${lowStock}`,
            cta: { label: "Restock", href: "/vendor/products" },
          });
        }
        if ((openDisputes || 0) > 0) {
          list.push({
            id: "disputes",
            severity: "warning",
            icon: AlertTriangle,
            title: `${openDisputes} open dispute(s)`,
            body: "Respond within 24h to avoid auto-refund escalation.",
            cta: { label: "Review", href: "/vendor/orders?tab=disputes" },
          });
        }
        const pendingPayout = (payouts || []).reduce((a, r) => a + Number(r.amount || 0), 0);
        if (pendingPayout > 0) {
          list.push({
            id: "payout",
            severity: "info",
            icon: Wallet,
            title: `₹${pendingPayout.toLocaleString()} payout in progress`,
            body: "Bank transfer typically settles in 1–3 business days.",
            cta: { label: "Wallet", href: "/vendor/wallet" },
          });
        }
        if (delta <= -15 && wkPrev > 0) {
          list.push({
            id: "salesdrop",
            severity: "warning",
            icon: TrendingDown,
            title: `Sales down ${Math.abs(delta).toFixed(0)}% WoW`,
            body: "Consider a flash sale or promoted listing to recover momentum.",
            cta: { label: "Create promo", href: "/vendor/settings?tab=promotions" },
          });
        } else if (delta >= 15) {
          list.push({
            id: "salesup",
            severity: "success",
            icon: TrendingUp,
            title: `Sales up ${delta.toFixed(0)}% WoW`,
            body: "Keep the momentum — stock up your top-sellers.",
            cta: { label: "View analytics", href: "/vendor/analytics" },
          });
        }
        if (list.length === 0) {
          list.push({
            id: "allgood",
            severity: "success",
            icon: CheckCircle2,
            title: "All clear",
            body: "No urgent actions. Your store is humming along nicely.",
          });
        }
        list.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
        if (!cancelled) setInsights(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, impersonatedId]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0, success: 0 };
    insights.forEach(i => { c[i.severity]++; });
    return c;
  }, [insights]);

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Insights Pulse
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs">
            {counts.critical > 0 && <Badge variant="destructive">{counts.critical} critical</Badge>}
            {counts.warning > 0 && <Badge className="bg-warning/15 text-warning border-warning/30">{counts.warning} warnings</Badge>}
            {counts.success > 0 && counts.critical + counts.warning === 0 && (
              <Badge className="bg-success/15 text-success border-success/30">All clear</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((it, idx) => (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, type: "spring", stiffness: 400, damping: 30 }}
                className={`rounded-xl border p-4 flex items-start gap-3 ${severityStyles[it.severity]}`}
              >
                <div className="w-9 h-9 rounded-lg bg-background/60 flex items-center justify-center shrink-0">
                  <it.icon className="w-4.5 h-4.5" />
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

export default VendorInsightsPulse;
