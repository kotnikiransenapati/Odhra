import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, AlertOctagon, CheckCircle2, RefreshCw, Wrench } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Overall = "operational" | "degraded" | "major_outage";
type Incident = {
  id: string; title: string; severity: string; status: string;
  affected_services: string[]; public_summary: string; started_at: string; updated_at: string;
  resolved_at?: string | null;
};
type ServiceRow = { service: string; status: string; latency_ms: number | null; reported_at: string };
type Snapshot = {
  generated_at: string;
  overall: Overall;
  active_incidents: Incident[];
  recent_incidents: Incident[];
  services: ServiceRow[];
};

const overallTone: Record<Overall, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  operational: { label: "All systems operational", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-300", Icon: CheckCircle2 },
  degraded:    { label: "Degraded performance",    cls: "bg-amber-500/10 text-amber-700 border-amber-300",       Icon: Wrench },
  major_outage:{ label: "Major service outage",    cls: "bg-red-500/10 text-red-700 border-red-300",             Icon: AlertOctagon },
};

const serviceTone: Record<string, string> = {
  healthy: "bg-emerald-100 text-emerald-700",
  degraded: "bg-amber-100 text-amber-700",
  down: "bg-red-100 text-red-700",
};

export default function Status() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>
    }).rpc("public_status_snapshot");
    if (!error) setSnap(data as Snapshot);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const overall = snap?.overall ?? "operational";
  const tone = overallTone[overall];
  const ToneIcon = tone.Icon;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>System Status · Real-Time Service Health</title>
        <meta name="description" content="Live status of platform services, incidents, and recent reliability events." />
        <link rel="canonical" href="/status" />
      </Helmet>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="w-7 h-7 text-primary" /> System Status</h1>
          <p className="text-muted-foreground">Live health of our customer, vendor, and admin surfaces.</p>
        </header>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
          <Card className={cn("p-5 border-2", tone.cls)}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <ToneIcon className="w-7 h-7" />
                <div>
                  <div className="text-lg font-bold">{tone.label}</div>
                  {snap?.generated_at && <div className="text-xs opacity-80">Updated {formatDistanceToNow(new Date(snap.generated_at), { addSuffix: true })}</div>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} /> Refresh</Button>
            </div>
          </Card>
        </motion.div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Active incidents</h2>
          {loading && !snap ? <Skeleton className="h-24 w-full" />
            : (snap?.active_incidents.length ?? 0) === 0 ? <Card className="p-5 text-sm text-muted-foreground">No active incidents.</Card>
            : <div className="space-y-3">
                {snap!.active_incidents.map((i) => (
                  <Card key={i.id} className="p-4 border-l-4 border-l-red-500">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="font-semibold">{i.title}</div>
                      <div className="flex items-center gap-1"><Badge variant="destructive">{i.severity}</Badge><Badge variant="secondary">{i.status}</Badge></div>
                    </div>
                    {i.public_summary && <p className="text-sm text-muted-foreground mt-1">{i.public_summary}</p>}
                    <div className="text-xs text-muted-foreground mt-2">Started {format(new Date(i.started_at), "MMM d, HH:mm")}{i.affected_services.length > 0 && ` · affects ${i.affected_services.join(", ")}`}</div>
                  </Card>
                ))}
              </div>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Services</h2>
          {loading && !snap ? <Skeleton className="h-32 w-full" />
            : (snap?.services.length ?? 0) === 0 ? <Card className="p-5 text-sm text-muted-foreground">No recent heartbeats reported.</Card>
            : <Card className="p-0 overflow-hidden">
                <div className="divide-y">
                  {snap!.services.map((s) => (
                    <div key={s.service} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="font-mono text-sm truncate">{s.service}</div>
                      <div className="flex items-center gap-2">
                        {s.latency_ms != null && <span className="text-xs text-muted-foreground">{s.latency_ms}ms</span>}
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", serviceTone[s.status] ?? "bg-muted")}>{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recent history (14 days)</h2>
          {(snap?.recent_incidents.length ?? 0) === 0 ? <Card className="p-5 text-sm text-muted-foreground">No resolved incidents in the past 14 days.</Card>
            : <div className="space-y-2">
                {snap!.recent_incidents.map((i) => (
                  <Card key={i.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.title}</div>
                      <div className="text-xs text-muted-foreground">Resolved {i.resolved_at ? format(new Date(i.resolved_at), "MMM d, HH:mm") : "—"}</div>
                    </div>
                    <Badge variant="outline">{i.severity}</Badge>
                  </Card>
                ))}
              </div>}
        </section>
      </main>
    </div>
  );
}
