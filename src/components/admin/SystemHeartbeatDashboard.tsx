import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type Heartbeat = {
  service_name: string;
  service_kind: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  latency_ms: number | null;
  detail: Record<string, unknown> | null;
  observed_at: string;
  is_stale: boolean;
};

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  healthy:  { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Healthy" },
  degraded: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Degraded" },
  down:     { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Down" },
  unknown:  { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/40 border-border", label: "Unknown" },
};

export function SystemHeartbeatDashboard() {
  const [data, setData] = useState<Heartbeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowMin, setWindowMin] = useState(15);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await (supabase as any).rpc("admin_latest_heartbeats", {
      _within_minutes: windowMin,
    });
    if (!error && Array.isArray(rows)) setData(rows as Heartbeat[]);
    setLoading(false);
  }, [windowMin]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const summary = data.reduce(
    (acc, h) => {
      const key = h.is_stale ? "stale" : h.status;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            System Heartbeats
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live status of edge functions, cron jobs, and external integrations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={windowMin}
            onChange={(e) => setWindowMin(Number(e.target.value))}
            className="text-sm rounded-md border border-input bg-background px-3 py-2"
          >
            <option value={5}>Stale &gt; 5 min</option>
            <option value={15}>Stale &gt; 15 min</option>
            <option value={60}>Stale &gt; 1 hour</option>
            <option value={1440}>Stale &gt; 1 day</option>
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { k: "healthy", label: "Healthy" },
          { k: "degraded", label: "Degraded" },
          { k: "down", label: "Down" },
          { k: "stale", label: "Stale" },
          { k: "unknown", label: "Unknown" },
        ].map((s) => (
          <Card key={s.k} className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</div>
            <div className="text-3xl font-bold mt-1">{summary[s.k] ?? 0}</div>
          </Card>
        ))}
      </div>

      {loading && data.length === 0 ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No heartbeats reported yet. Wrap your edge functions with{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs">withHeartbeat()</code>.
        </Card>
      ) : (
        <div className="grid gap-2">
          {data.map((h, i) => {
            const effective = h.is_stale ? "down" : h.status;
            const style = STATUS_STYLES[effective] ?? STATUS_STYLES.unknown;
            const Icon = style.icon;
            return (
              <motion.div
                key={h.service_name}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, type: "spring", stiffness: 400, damping: 30 }}
              >
                <Card className={cn("p-4 border", style.bg)}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={cn("w-5 h-5 shrink-0", style.color)} />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{h.service_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {h.service_kind} · {style.label}
                          {h.is_stale && <span className="text-red-600"> · stale</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {h.latency_ms != null && (
                        <Badge variant="secondary" className="font-mono">
                          {h.latency_ms} ms
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(h.observed_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {h.detail && Object.keys(h.detail).length > 0 && (
                    <pre className="mt-3 text-xs bg-background/60 rounded p-2 overflow-x-auto max-h-32">
                      {JSON.stringify(h.detail, null, 2)}
                    </pre>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
