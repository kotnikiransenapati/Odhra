import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BellRing, CheckCircle2, Play, RefreshCw, ShieldAlert, Siren, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Metric = "error_count" | "error_rate" | "p95_latency_ms" | "heartbeat_stale" | "open_circuit_count";
type Severity = "info" | "warning" | "critical";
type AlertStatus = "open" | "acknowledged" | "resolved" | "suppressed";

type Rule = {
  id: string;
  name: string;
  metric: Metric;
  scope: string;
  severity: Severity;
  comparison: "gte" | "lte";
  threshold: number;
  window_minutes: number;
  baseline_minutes: number;
  min_samples: number;
  cooldown_minutes: number;
  notification_channels: string[];
  enabled: boolean;
  updated_at: string;
};

type Alert = {
  id: string;
  rule_id: string | null;
  metric: Metric;
  scope: string;
  severity: Severity;
  status: AlertStatus;
  observed_value: number;
  baseline_value: number | null;
  threshold: number;
  sample_count: number;
  details: Record<string, unknown> | null;
  detected_at: string;
};

type RunResult = {
  rule_id: string;
  alert_id: string | null;
  metric: Metric;
  scope: string;
  severity: Severity;
  observed_value: number;
  baseline_value: number | null;
  threshold: number;
  sample_count: number;
  status: string;
};

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const metricLabels: Record<Metric, string> = {
  error_count: "Error count",
  error_rate: "Error rate %",
  p95_latency_ms: "p95 latency",
  heartbeat_stale: "Stale heartbeats",
  open_circuit_count: "Open circuits",
};

const severityClass: Record<Severity, string> = {
  info: "text-muted-foreground",
  warning: "text-warning",
  critical: "text-destructive",
};

const emptyRule = {
  name: "",
  metric: "error_count" as Metric,
  scope: "*",
  severity: "warning" as Severity,
  comparison: "gte" as const,
  threshold: "10",
  window_minutes: "15",
  baseline_minutes: "240",
  min_samples: "1",
  cooldown_minutes: "60",
  notification_channels: "admin_dashboard",
};

export function AnomalyAlertsPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyRule);
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const rpcClient = supabase as unknown as RpcClient;

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, alertsRes] = await Promise.all([
      supabase.from("anomaly_alert_rules").select("*").order("updated_at", { ascending: false }),
      supabase.from("anomaly_alerts").select("*").order("detected_at", { ascending: false }).limit(80),
    ]);
    if (rulesRes.error) toast.error(rulesRes.error.message);
    else setRules((rulesRes.data ?? []) as Rule[]);
    if (alertsRes.error) toast.error(alertsRes.error.message);
    else setAlerts((alertsRes.data ?? []) as Alert[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const summary = useMemo(() => {
    return alerts.reduce(
      (acc, alert) => {
        acc[alert.status] = (acc[alert.status] ?? 0) + 1;
        if (alert.status === "open" && alert.severity === "critical") acc.criticalOpen += 1;
        return acc;
      },
      { open: 0, acknowledged: 0, resolved: 0, suppressed: 0, criticalOpen: 0 } as Record<AlertStatus | "criticalOpen", number>,
    );
  }, [alerts]);

  const createRule = async () => {
    if (form.name.trim().length < 3) return toast.error("Rule name is required");
    setSaving(true);
    const { error } = await supabase.from("anomaly_alert_rules").insert({
      name: form.name.trim(),
      metric: form.metric,
      scope: form.scope.trim() || "*",
      severity: form.severity,
      comparison: form.comparison,
      threshold: Number(form.threshold),
      window_minutes: Number(form.window_minutes),
      baseline_minutes: Number(form.baseline_minutes),
      min_samples: Number(form.min_samples),
      cooldown_minutes: Number(form.cooldown_minutes),
      notification_channels: form.notification_channels.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Anomaly rule created");
    setForm(emptyRule);
    load();
  };

  const toggleRule = async (rule: Rule) => {
    const { error } = await supabase
      .from("anomaly_alert_rules")
      .update({ enabled: !rule.enabled })
      .eq("id", rule.id);
    if (error) return toast.error(error.message);
    load();
  };

  const runDetection = async (dryRun: boolean) => {
    setRunning(true);
    const { data, error } = await rpcClient.rpc("admin_run_anomaly_detection", { _dry_run: dryRun });
    setRunning(false);
    if (error) return toast.error(error.message);
    const rows = Array.isArray(data) ? (data as RunResult[]) : [];
    setRunResults(rows);
    toast.success(dryRun ? `${rows.length} potential breach${rows.length === 1 ? "" : "es"} found` : `${rows.length} alert check${rows.length === 1 ? "" : "s"} processed`);
    load();
  };

  const setStatus = async (id: string, status: Exclude<AlertStatus, "open">) => {
    const { error } = await rpcClient.rpc("admin_set_anomaly_alert_status", { _id: id, _status: status });
    if (error) return toast.error(error.message);
    toast.success(`Alert ${status}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Siren className="w-6 h-6 text-primary" /> Anomaly Alerts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Threshold and baseline-driven detection across errors, latency, heartbeats, and circuit breakers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => runDetection(true)} disabled={running}>
            <Play className="w-4 h-4 mr-1" /> Dry run
          </Button>
          <Button size="sm" onClick={() => runDetection(false)} disabled={running}>
            <BellRing className="w-4 h-4 mr-1" /> Run detector
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh anomaly alerts">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Open", value: summary.open, icon: AlertTriangle, cls: "text-warning" },
          { label: "Critical", value: summary.criticalOpen, icon: ShieldAlert, cls: "text-destructive" },
          { label: "Acknowledged", value: summary.acknowledged, icon: CheckCircle2, cls: "text-accent" },
          { label: "Rules", value: rules.length, icon: BellRing, cls: "text-primary" },
          { label: "Enabled", value: rules.filter((r) => r.enabled).length, icon: Play, cls: "text-muted-foreground" },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><item.icon className={cn("w-4 h-4", item.cls)} /> {item.label}</div>
            <div className="text-3xl font-bold mt-1">{item.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="font-semibold">Create detection rule</div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1.5 md:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Payment error spike" /></div>
              <div className="space-y-1.5"><Label>Scope</Label><Input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="* or function name" /></div>
              <div className="space-y-1.5"><Label>Metric</Label><Select value={form.metric} onValueChange={(v) => setForm({ ...form, metric: v as Metric })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(metricLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Severity</Label><Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as Severity })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Threshold</Label><Input type="number" min="0" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Window min</Label><Input type="number" min="1" value={form.window_minutes} onChange={(e) => setForm({ ...form, window_minutes: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Baseline min</Label><Input type="number" min="15" value={form.baseline_minutes} onChange={(e) => setForm({ ...form, baseline_minutes: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Cooldown min</Label><Input type="number" min="1" value={form.cooldown_minutes} onChange={(e) => setForm({ ...form, cooldown_minutes: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Channels</Label><Input value={form.notification_channels} onChange={(e) => setForm({ ...form, notification_channels: e.target.value })} placeholder="admin_dashboard,email" /></div>
            <Button onClick={createRule} disabled={saving}>{saving ? "Saving..." : "Create rule"}</Button>
          </div>
          <div className="space-y-3">
            <div className="font-semibold">Last detector output</div>
            {runResults.length === 0 ? <div className="text-sm text-muted-foreground rounded-md border p-4">No detector run in this session.</div> : (
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {runResults.map((r) => <div key={`${r.rule_id}-${r.metric}-${r.status}`} className="rounded-md border p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{metricLabels[r.metric]}</span><Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge></div><div className="text-xs text-muted-foreground mt-1">{r.scope} · observed {Number(r.observed_value).toFixed(2)} / threshold {Number(r.threshold).toFixed(2)}</div></div>)}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Rules</div>
          {loading && rules.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : rules.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No anomaly rules yet.</div> : (
            <div className="divide-y">
              {rules.map((rule) => <div key={rule.id} className="p-4 flex items-center justify-between gap-3"><div className="min-w-0"><div className="font-medium truncate">{rule.name}</div><div className="text-xs text-muted-foreground">{metricLabels[rule.metric]} · {rule.scope} · threshold {rule.threshold}</div></div><div className="flex items-center gap-2"><Badge variant={rule.severity === "critical" ? "destructive" : "secondary"}>{rule.severity}</Badge><Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule)} /></div></div>)}
            </div>
          )}
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Recent alerts</div>
          {loading && alerts.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div> : alerts.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No alerts have fired.</div> : (
            <div className="divide-y max-h-[620px] overflow-auto">
              {alerts.map((alert, i) => (
                <motion.div key={alert.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015, type: "spring", stiffness: 400, damping: 30 }} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-medium">{metricLabels[alert.metric]}</span><Badge variant={alert.status === "open" ? "destructive" : "secondary"}>{alert.status}</Badge><span className={cn("text-xs font-medium", severityClass[alert.severity])}>{alert.severity}</span></div>
                      <div className="text-xs text-muted-foreground mt-1">{alert.scope} · {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })} · {alert.sample_count} samples</div>
                      <div className="text-sm mt-2">Observed <span className="font-mono">{Number(alert.observed_value).toFixed(2)}</span>{alert.baseline_value != null && <> vs baseline <span className="font-mono">{Number(alert.baseline_value).toFixed(2)}</span></>} · threshold <span className="font-mono">{Number(alert.threshold).toFixed(2)}</span></div>
                    </div>
                    {alert.status === "open" && <div className="flex items-center gap-1 shrink-0"><Button size="sm" variant="outline" onClick={() => setStatus(alert.id, "acknowledged")}><CheckCircle2 className="w-4 h-4 mr-1" /> Ack</Button><Button size="sm" variant="outline" onClick={() => setStatus(alert.id, "resolved")}><XCircle className="w-4 h-4 mr-1" /> Resolve</Button></div>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}