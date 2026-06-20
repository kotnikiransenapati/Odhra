/**
 * P6 — Kill-Switch & Circuit-Breaker Control Panel
 * ------------------------------------------------
 * Emergency-ops surface for two protective mechanisms:
 *
 *  Kill switches  — admin-toggled feature gates. Toggling REQUIRES a reason
 *                   (security: every change is attributed via toggled_by/at).
 *  Circuit breakers — automated failure isolation. Admins can FORCE open
 *                     (cool-down) or CLOSE (reset failure_count to 0).
 *
 * Both lists are grouped by category and searchable. Realtime updates.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, CircuitBoard, Power, RefreshCw, ShieldOff, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type KillSwitch = { key: string; label: string; description: string | null; category: string | null; is_enabled: boolean; reason: string | null; toggled_by: string | null; toggled_at: string | null };
type Breaker = { service_key: string; label: string; category: string | null; state: "closed"|"open"|"half_open"; failure_count: number; success_count: number; failure_threshold: number; cooldown_seconds: number; opened_until: string | null; last_failure_at: string | null; last_success_at: string | null; last_error: string | null; updated_at: string };

const STATE_VARIANT: Record<Breaker["state"], "default"|"secondary"|"destructive"|"outline"> = {
  closed: "secondary", half_open: "default", open: "destructive",
};

export default function KillSwitchControlPanel() {
  const [switches, setSwitches] = useState<KillSwitch[]>([]);
  const [breakers, setBreakers] = useState<Breaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<KillSwitch | null>(null);
  const [reason, setReason] = useState("");
  const [pendingNext, setPendingNext] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, b] = await Promise.all([
      (supabase.from("kill_switches") as any).select("*").order("category").order("label"),
      (supabase.from("outbound_circuit_breakers") as any).select("*").order("category").order("label"),
    ]);
    setSwitches((s.data ?? []) as KillSwitch[]);
    setBreakers((b.data ?? []) as Breaker[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("killswitch-cb-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "kill_switches" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "outbound_circuit_breakers" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const filteredSwitches = useMemo(() => filterBy(switches, q, s => `${s.label} ${s.key} ${s.category ?? ""}`), [switches, q]);
  const filteredBreakers = useMemo(() => filterBy(breakers, q, b => `${b.label} ${b.service_key} ${b.category ?? ""}`), [breakers, q]);
  const enabledCount = switches.filter(s => s.is_enabled).length;
  const openBreakers = breakers.filter(b => b.state === "open").length;

  const askToggle = (sw: KillSwitch, next: boolean) => {
    setPending(sw); setPendingNext(next); setReason("");
  };
  const confirmToggle = async () => {
    if (!pending) return;
    if (!reason.trim()) { toast.error("Reason is required for audit"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase.from("kill_switches") as any).update({
      is_enabled: pendingNext, reason: reason.trim(), toggled_by: u.user?.id ?? null, toggled_at: new Date().toISOString(),
    }).eq("key", pending.key);
    if (error) { toast.error(error.message); return; }
    toast.success(`${pending.label} ${pendingNext ? "engaged" : "released"}`);
    setPending(null); load();
  };

  const forceOpen = async (b: Breaker) => {
    if (!confirm(`Force-open breaker "${b.label}"? Outbound traffic will be blocked for ${b.cooldown_seconds}s.`)) return;
    const { data: u } = await supabase.auth.getUser();
    const until = new Date(Date.now() + b.cooldown_seconds * 1000).toISOString();
    await (supabase.from("outbound_circuit_breakers") as any).update({
      state: "open", opened_until: until, updated_by: u.user?.id ?? null,
    }).eq("service_key", b.service_key);
    toast.success("Breaker opened"); load();
  };
  const forceClose = async (b: Breaker) => {
    const { data: u } = await supabase.auth.getUser();
    await (supabase.from("outbound_circuit_breakers") as any).update({
      state: "closed", failure_count: 0, opened_until: null, updated_by: u.user?.id ?? null,
    }).eq("service_key", b.service_key);
    toast.success("Breaker closed & failure count reset"); load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kill-Switch & Circuit-Breaker Control</h2>
          <p className="text-sm text-muted-foreground">Emergency feature gates and outbound-service breakers. Every change is audited.</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} className="w-56" />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label="Engaged switches" value={enabledCount} tone={enabledCount ? "warn" : "good"} icon={<ShieldOff className="h-4 w-4" />} />
        <Kpi label="Open breakers" value={openBreakers} tone={openBreakers ? "danger" : "good"} icon={<CircuitBoard className="h-4 w-4" />} />
        <Kpi label="Total controls" value={switches.length + breakers.length} tone="good" icon={<Power className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="switches">
        <TabsList>
          <TabsTrigger value="switches">Kill switches ({switches.length})</TabsTrigger>
          <TabsTrigger value="breakers">Circuit breakers ({breakers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="switches">
          <Card><CardContent className="p-0">
            {loading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            : filteredSwitches.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No kill switches.</div>
            : groupBy(filteredSwitches, s => s.category ?? "general").map(([cat, items]) => (
              <div key={cat}>
                <div className="px-4 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">{cat}</div>
                <div className="divide-y">{items.map(sw => (
                  <div key={sw.key} className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{sw.label}</span>
                        <Badge variant="outline" className="text-[10px]">{sw.key}</Badge>
                        {sw.is_enabled && <Badge variant="destructive" className="text-[10px]"><Zap className="h-3 w-3 mr-1" />ENGAGED</Badge>}
                      </div>
                      {sw.description && <div className="text-xs text-muted-foreground mt-0.5">{sw.description}</div>}
                      {sw.toggled_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          last changed {formatDistanceToNow(new Date(sw.toggled_at), { addSuffix: true })}
                          {sw.reason && <> · reason: <i>{sw.reason}</i></>}
                        </div>
                      )}
                    </div>
                    <Switch checked={sw.is_enabled} onCheckedChange={(v) => askToggle(sw, v)} />
                  </div>
                ))}</div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="breakers">
          <Card><CardContent className="p-0">
            {loading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            : filteredBreakers.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No circuit breakers.</div>
            : groupBy(filteredBreakers, b => b.category ?? "general").map(([cat, items]) => (
              <div key={cat}>
                <div className="px-4 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">{cat}</div>
                <div className="divide-y">{items.map(b => {
                  const openExpires = b.opened_until ? new Date(b.opened_until).getTime() - Date.now() : 0;
                  return (
                    <div key={b.service_key} className="p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{b.label}</span>
                          <Badge variant="outline" className="text-[10px]">{b.service_key}</Badge>
                          <Badge variant={STATE_VARIANT[b.state]} className="text-[10px]">{b.state}</Badge>
                          {b.state === "open" && openExpires > 0 && (
                            <Badge variant="outline" className="text-[10px]">re-opens in {Math.ceil(openExpires/1000)}s</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          failures <b>{b.failure_count}</b>/{b.failure_threshold} · cooldown {b.cooldown_seconds}s
                          {b.last_success_at && <> · last ok {formatDistanceToNow(new Date(b.last_success_at), { addSuffix: true })}</>}
                        </div>
                        {b.last_error && b.state !== "closed" && (
                          <div className="text-xs text-destructive mt-1 truncate flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />{b.last_error}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {b.state !== "open"
                          ? <Button size="sm" variant="destructive" onClick={() => forceOpen(b)}>Force open</Button>
                          : <Button size="sm" onClick={() => forceClose(b)}>Close & reset</Button>}
                      </div>
                    </div>
                  );
                })}</div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingNext ? "Engage" : "Release"} kill switch: {pending?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {pendingNext
                ? "Engaging will immediately block the gated feature for all users."
                : "Releasing restores normal operation for the gated feature."}
            </p>
            <Label>Reason (required, will be audited)</Label>
            <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder={pendingNext ? "Blocking checkout — payment provider degradation" : "Provider recovered, restoring traffic"} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
            <Button variant={pendingNext ? "destructive" : "default"} onClick={confirmToggle}>
              {pendingNext ? "Engage" : "Release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function filterBy<T>(arr: T[], q: string, key: (t: T) => string): T[] {
  const s = q.trim().toLowerCase(); if (!s) return arr;
  return arr.filter(x => key(x).toLowerCase().includes(s));
}
function groupBy<T>(arr: T[], key: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const x of arr) { const k = key(x); (m.get(k) ?? m.set(k, []).get(k)!).push(x); }
  return Array.from(m.entries()).sort(([a],[b]) => a.localeCompare(b));
}
