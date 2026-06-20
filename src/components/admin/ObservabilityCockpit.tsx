/**
 * P1 — Observability Cockpit (UI)
 * Consumes src/lib/observabilityData.ts for the admin Health & Ops view.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, AlertTriangle, Activity, TrendingUp } from "lucide-react";
import {
  getObservabilitySnapshot,
  type ObservabilitySnapshot,
} from "@/lib/observabilityData";
import { toast } from "sonner";

const RANGE_OPTIONS = [
  { label: "Last 24h", value: 1 },
  { label: "Last 7d", value: 7 },
  { label: "Last 30d", value: 30 },
];

function Stat({ label, value, hint, tone = "default" }: {
  label: string; value: string | number; hint?: string;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const toneCls = {
    default: "text-foreground",
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  }[tone];
  return (
    <Card className="card-interactive">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${toneCls}`}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function MiniFunnelBar({ funnel }: { funnel: ObservabilitySnapshot["funnel"] }) {
  const max = Math.max(1, ...funnel.flatMap(f => [f.views, f.carts, f.checkouts, f.paid]));
  return (
    <div className="space-y-2">
      {funnel.slice(-10).map(p => (
        <div key={p.day} className="grid grid-cols-[80px,1fr,80px] items-center gap-2">
          <span className="text-xs text-muted-foreground">{p.day}</span>
          <div className="flex h-3 overflow-hidden rounded bg-muted">
            <div className="bg-primary/30" style={{ width: `${(p.views / max) * 100}%` }} />
            <div className="bg-primary/60" style={{ width: `${(p.carts / max) * 100}%` }} />
            <div className="bg-primary/80" style={{ width: `${(p.checkouts / max) * 100}%` }} />
            <div className="bg-primary" style={{ width: `${(p.paid / max) * 100}%` }} />
          </div>
          <span className="text-xs text-right tabular-nums">{p.paid}</span>
        </div>
      ))}
      {!funnel.length && <p className="text-sm text-muted-foreground">No funnel data in range.</p>}
    </div>
  );
}

export default function ObservabilityCockpit() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [snap, setSnap] = useState<ObservabilitySnapshot | null>(null);

  async function load(d = days) {
    setLoading(true);
    try {
      setSnap(await getObservabilitySnapshot(d));
    } catch (e) {
      toast.error("Failed to load observability snapshot", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(days); /* eslint-disable-next-line */ }, [days]);

  const opsTone = useMemo<"good" | "warn" | "danger">(() => {
    if (!snap) return "good";
    if (snap.ops.critical_breaches > 0 || snap.ops.active_incidents > 0) return "danger";
    if (snap.ops.open_breaches > 0 || snap.ops.dlq_depth > 0) return "warn";
    return "good";
  }, [snap]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Observability Cockpit
          </h1>
          <p className="text-sm text-muted-foreground">
            Unified commerce, ops, and vendor pulse — refreshed on demand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </header>

      {loading && !snap ? (
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !snap ? (
        <p className="text-muted-foreground">No data.</p>
      ) : (
        <>
          {/* Commerce row */}
          <section className="grid gap-3 md:grid-cols-4">
            <Stat label="GMV" value={`₹${snap.commerce.gmv.toLocaleString("en-IN")}`} hint={`${snap.commerce.paid_orders} paid orders`} tone="good" />
            <Stat label="AOV" value={`₹${snap.commerce.aov.toLocaleString("en-IN")}`} hint="Avg order value" />
            <Stat label="Refund rate" value={`${(snap.commerce.refund_rate * 100).toFixed(1)}%`} tone={snap.commerce.refund_rate > 0.05 ? "warn" : "default"} />
            <Stat label="COD share" value={`${(snap.commerce.cod_share * 100).toFixed(0)}%`} hint={`${snap.commerce.orders} total orders`} />
          </section>

          {/* Ops row */}
          <section className="grid gap-3 md:grid-cols-4">
            <Stat label="Active incidents" value={snap.ops.active_incidents} tone={opsTone === "danger" ? "danger" : "default"} />
            <Stat label="Open SLA breaches" value={snap.ops.open_breaches} hint={`${snap.ops.critical_breaches} critical`} tone={snap.ops.critical_breaches > 0 ? "danger" : snap.ops.open_breaches > 0 ? "warn" : "good"} />
            <Stat label="DLQ depth" value={snap.ops.dlq_depth} tone={snap.ops.dlq_depth > 0 ? "warn" : "good"} />
            <Stat label="Errors (24h)" value={snap.ops.error_logs_24h} tone={snap.ops.error_logs_24h > 50 ? "warn" : "default"} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {/* Funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" /> Conversion funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniFunnelBar funnel={snap.funnel} />
              </CardContent>
            </Card>

            {/* Probes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Service probes</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[260px] pr-2">
                  <ul className="space-y-2">
                    {snap.probes.map(p => (
                      <li key={p.probe_id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{p.name}</span>
                        <span className="flex items-center gap-2">
                          {p.latency_ms != null && (
                            <span className="text-xs text-muted-foreground tabular-nums">{p.latency_ms}ms</span>
                          )}
                          <Badge variant={p.healthy ? "default" : "destructive"}>
                            {p.healthy ? "healthy" : "down"}
                          </Badge>
                        </span>
                      </li>
                    ))}
                    {!snap.probes.length && (
                      <p className="text-sm text-muted-foreground">No active probes configured.</p>
                    )}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {/* Edge functions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Edge functions (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[260px] pr-2">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="text-left">
                        <th className="py-1">Function</th>
                        <th className="text-right">Calls</th>
                        <th className="text-right">p95</th>
                        <th className="text-right">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snap.edge_fns.map(f => (
                        <tr key={f.fn} className="border-t border-border/50">
                          <td className="py-1 truncate max-w-[200px]">{f.fn}</td>
                          <td className="text-right tabular-nums">{f.calls}</td>
                          <td className="text-right tabular-nums">{f.p95_ms}ms</td>
                          <td className={`text-right tabular-nums ${f.error_rate > 0.05 ? "text-red-500" : ""}`}>
                            {(f.error_rate * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!snap.edge_fns.length && (
                    <p className="text-sm text-muted-foreground">No edge function calls recorded.</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Vendor pulse */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Vendor pulse
                  {snap.vendors.payout_backlog > 0 && (
                    <Badge variant="outline" className="ml-2">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {snap.vendors.payout_backlog} payouts pending
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(["pending","submitted","verified","rejected"] as const).map(k => (
                    <div key={k} className="rounded border p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">{k}</p>
                      <p className="text-lg font-semibold">{snap.vendors.kyc_funnel[k]}</p>
                    </div>
                  ))}
                </div>
                <ul className="space-y-1.5">
                  {snap.vendors.top_by_gmv.map(v => (
                    <li key={v.vendor_id} className="flex justify-between text-sm">
                      <span className="truncate">{v.brand_name}</span>
                      <span className="tabular-nums">₹{v.gmv.toLocaleString("en-IN")}</span>
                    </li>
                  ))}
                  {!snap.vendors.top_by_gmv.length && (
                    <p className="text-sm text-muted-foreground">No vendor sales in range.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </section>

          <p className="text-xs text-muted-foreground">
            Snapshot generated {new Date(snap.generated_at).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
