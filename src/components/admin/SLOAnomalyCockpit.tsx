/**
 * P5 — SLO & Anomaly Cockpit
 * --------------------------
 * Unified surface for reliability:
 *  - SLO definitions panel (target, window, enable toggle)
 *  - Live anomaly alert feed with Acknowledge / Resolve flow
 *  - Anomaly rules catalog (toggle enabled, view threshold/comparison)
 *  - Service health probes status with latency + consecutive-failures
 *
 * Realtime: anomaly_alerts subscription keeps the feed live.
 * Security: all writes are RLS-scoped (admin). Acks stamp acknowledged_by/at.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, CheckCircle2, Gauge, Heart, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type SLO = { id: string; name: string; description: string | null; target_type: string; target_value: number; window_minutes: number; scope: string; scope_ref: string | null; enabled: boolean };
type AnomalyAlert = { id: string; rule_id: string | null; metric: string; scope: string; severity: string; status: string; observed_value: number; baseline_value: number | null; threshold: number; sample_count: number; detected_at: string; acknowledged_at: string | null; resolved_at: string | null };
type AnomalyRule = { id: string; name: string; metric: string; scope: string; severity: string; comparison: string; threshold: number; window_minutes: number; cooldown_minutes: number; enabled: boolean };
type Probe = { id: string; name: string; url: string; is_active: boolean; last_status: string | null; last_latency_ms: number | null; consecutive_failures: number; last_run_at: string | null };

const SEV_VARIANT: Record<string, "default"|"secondary"|"destructive"|"outline"> = {
  info: "secondary", low: "outline", minor: "outline", warning: "default",
  major: "default", high: "destructive", critical: "destructive",
};

export default function SLOAnomalyCockpit() {
  const [slos, setSlos] = useState<SLO[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [rules, setRules] = useState<AnomalyRule[]>([]);
  const [probes, setProbes] = useState<Probe[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, a, r, p] = await Promise.all([
      (supabase.from("slo_definitions") as any).select("*").order("name"),
      (supabase.from("anomaly_alerts") as any).select("*").order("detected_at", { ascending: false }).limit(100),
      (supabase.from("anomaly_alert_rules") as any).select("*").order("name"),
      (supabase.from("service_health_probes") as any).select("*").order("name"),
    ]);
    setSlos((s.data ?? []) as SLO[]);
    setAlerts((a.data ?? []) as AnomalyAlert[]);
    setRules((r.data ?? []) as AnomalyRule[]);
    setProbes((p.data ?? []) as Probe[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("slo-anomaly-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "anomaly_alerts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_health_probes" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const openAlerts = useMemo(() => alerts.filter(a => !a.resolved_at), [alerts]);
  const unhealthyProbes = useMemo(() => probes.filter(p => p.is_active && (p.last_status !== "ok" || p.consecutive_failures > 0)), [probes]);

  const ack = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    await (supabase.from("anomaly_alerts") as any)
      .update({ status: "acknowledged", acknowledged_by: u.user?.id ?? null, acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    toast.success("Acknowledged"); load();
  };
  const resolve = async (id: string) => {
    await (supabase.from("anomaly_alerts") as any)
      .update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    toast.success("Resolved"); load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SLO & Anomaly Cockpit</h2>
          <p className="text-sm text-muted-foreground">Service-level objectives, live anomaly detection, and probe health.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Open anomalies" value={openAlerts.length} tone={openAlerts.length ? "danger" : "good"} icon={<AlertTriangle className="h-4 w-4" />} />
        <Kpi label="Critical / High" value={openAlerts.filter(a => ["critical","high"].includes(a.severity)).length} tone="warn" icon={<ShieldAlert className="h-4 w-4" />} />
        <Kpi label="Unhealthy probes" value={unhealthyProbes.length} tone={unhealthyProbes.length ? "danger" : "good"} icon={<Heart className="h-4 w-4" />} />
        <Kpi label="Active SLOs" value={slos.filter(s => s.enabled).length} tone="good" icon={<Gauge className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">Live alerts</TabsTrigger>
          <TabsTrigger value="slos">SLOs</TabsTrigger>
          <TabsTrigger value="rules">Detection rules</TabsTrigger>
          <TabsTrigger value="probes">Probes</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Anomaly alerts (last 100)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                {loading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div>
                : alerts.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No anomalies detected.</div>
                : <div className="divide-y">{alerts.map(a => (
                    <div key={a.id} className="p-4 flex items-start gap-3">
                      <div className="mt-1">
                        {a.resolved_at ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : a.acknowledged_at ? <Activity className="h-4 w-4 text-amber-600" />
                          : <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{a.metric}</span>
                          <Badge variant="outline" className="text-[10px]">{a.scope}</Badge>
                          <Badge variant={SEV_VARIANT[a.severity] ?? "outline"} className="text-[10px]">{a.severity}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{a.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          observed <b>{a.observed_value}</b>{a.baseline_value != null && <> · baseline <b>{a.baseline_value}</b></>} · threshold <b>{a.threshold}</b> · n={a.sample_count}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.detected_at), { addSuffix: true })}</div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {!a.acknowledged_at && !a.resolved_at && <Button size="sm" variant="outline" onClick={() => ack(a.id)}>Ack</Button>}
                        {!a.resolved_at && <Button size="sm" onClick={() => resolve(a.id)}>Resolve</Button>}
                      </div>
                    </div>
                  ))}</div>}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slos">
          <Card><CardContent className="p-0">
            {slos.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No SLOs defined.</div>
            : <div className="divide-y">{slos.map(s => (
              <div key={s.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-medium truncate">{s.name}</span>
                    <Badge variant="outline" className="text-[10px]">{s.target_type}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{s.scope}{s.scope_ref ? `:${s.scope_ref}` : ""}</Badge>
                  </div>
                  {s.description && <div className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</div>}
                  <div className="text-xs text-muted-foreground mt-0.5">target <b>{s.target_value}</b> · window {s.window_minutes}m</div>
                </div>
                <Switch checked={s.enabled} onCheckedChange={async (v) => {
                  await (supabase.from("slo_definitions") as any).update({ enabled: v }).eq("id", s.id); load();
                }} />
              </div>
            ))}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card><CardContent className="p-0">
            {rules.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No detection rules.</div>
            : <div className="divide-y">{rules.map(r => (
              <div key={r.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-medium truncate">{r.name}</span>
                    <Badge variant="outline" className="text-[10px]">{r.metric}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{r.scope}</Badge>
                    <Badge variant={SEV_VARIANT[r.severity] ?? "outline"} className="text-[10px]">{r.severity}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    trigger when value <b>{r.comparison}</b> {r.threshold} over {r.window_minutes}m · cooldown {r.cooldown_minutes}m
                  </div>
                </div>
                <Switch checked={r.enabled} onCheckedChange={async (v) => {
                  await (supabase.from("anomaly_alert_rules") as any).update({ enabled: v }).eq("id", r.id); load();
                }} />
              </div>
            ))}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="probes">
          <Card><CardContent className="p-0">
            {probes.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No probes configured.</div>
            : <div className="divide-y">{probes.map(p => {
              const ok = p.last_status === "ok";
              return (
                <div key={p.id} className="p-4 flex items-center gap-3">
                  <Heart className={`h-4 w-4 ${ok ? "text-emerald-600" : "text-destructive"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium truncate">{p.name}</span>
                      <Badge variant={ok ? "outline" : "destructive"} className="text-[10px]">{p.last_status ?? "—"}</Badge>
                      {p.consecutive_failures > 0 && <Badge variant="destructive" className="text-[10px]">{p.consecutive_failures} fails</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{p.url}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.last_latency_ms != null && <>{p.last_latency_ms}ms · </>}
                      {p.last_run_at ? formatDistanceToNow(new Date(p.last_run_at), { addSuffix: true }) : "never run"}
                    </div>
                  </div>
                  <Switch checked={p.is_active} onCheckedChange={async (v) => {
                    await (supabase.from("service_health_probes") as any).update({ is_active: v }).eq("id", p.id); load();
                  }} />
                </div>
              );
            })}</div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, tone, icon }: { label: string; value: number; tone: "good"|"warn"|"danger"; icon: JSX.Element }) {
  const t = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-600" : "text-emerald-600";
  return (
    <Card><CardContent className="p-4 flex items-center justify-between">
      <div><div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${t}`}>{value}</div></div>
      <div className={t}>{icon}</div>
    </CardContent></Card>
  );
}
