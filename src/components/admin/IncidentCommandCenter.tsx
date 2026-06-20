/**
 * P3 — Incident Command Center
 * ----------------------------
 * Live ops surface for incident lifecycle:
 *  - List open + recent resolved incidents (Realtime channel)
 *  - Declare new incident (severity, impact, public flag)
 *  - Drill into incident: timeline of updates, post status transition, resolve w/ MTTR
 *  - One-click "Auto-Respond" — runs matching runbooks via autoRespond()
 *
 * Security: All writes go through incidentEngine which uses RLS-protected tables.
 * UI never trusts client clock; resolved_at + MTTR are server-derived from timestamps.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  declareIncident, postUpdate, resolveIncident, autoRespond,
  type Incident, type IncidentStatus, type Severity,
} from "@/lib/incidentEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertOctagon, Activity, CheckCircle2, Clock, Siren, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type IncidentRow = Incident & {
  impact?: string | null; is_public?: boolean; affected_services?: string[] | null;
  created_by?: string | null;
};
type Update = { id: string; incident_id: string; status: IncidentStatus; message: string; posted_by: string; created_at: string };

const SEV_VARIANT: Record<Severity, "default"|"secondary"|"destructive"|"outline"> = {
  info: "secondary", minor: "outline", major: "default", critical: "destructive",
};
const STATUS_ICON: Record<IncidentStatus, JSX.Element> = {
  investigating: <Siren className="h-3.5 w-3.5" />,
  identified:    <AlertOctagon className="h-3.5 w-3.5" />,
  monitoring:    <Activity className="h-3.5 w-3.5" />,
  resolved:      <CheckCircle2 className="h-3.5 w-3.5" />,
};

export default function IncidentCommandCenter() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IncidentRow | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [me, setMe] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("incidents") as any)
      .select("*").order("started_at", { ascending: false }).limit(50);
    setIncidents((data ?? []) as IncidentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? ""));
    load();
    const ch = supabase.channel("incidents-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const { data } = await (supabase.from("incident_updates") as any)
        .select("*").eq("incident_id", selected.id).order("created_at", { ascending: true });
      setUpdates((data ?? []) as Update[]);
    })();
  }, [selected]);

  const open = useMemo(() => incidents.filter(i => i.status !== "resolved"), [incidents]);
  const closed = useMemo(() => incidents.filter(i => i.status === "resolved").slice(0, 10), [incidents]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Incident Command Center</h2>
          <p className="text-sm text-muted-foreground">Declare, coordinate, and resolve production incidents in real time.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
          <DeclareDialog me={me} onCreated={load} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Open incidents" value={open.length} tone={open.length ? "danger" : "good"} icon={<Siren className="h-4 w-4" />} />
        <KpiCard label="Critical / Major" value={open.filter(i => i.severity === "critical" || i.severity === "major").length} tone="warn" icon={<AlertOctagon className="h-4 w-4" />} />
        <KpiCard label="Resolved (last 24h)"
          value={closed.filter(i => i.resolved_at && Date.now() - new Date(i.resolved_at).getTime() < 86400000).length}
          tone="good" icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Active</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[520px]">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading…</div>
              ) : open.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No active incidents — all systems healthy.</div>
              ) : open.map(i => (
                <IncidentRowItem key={i.id} i={i} selected={selected?.id === i.id} onClick={() => setSelected(i)} />
              ))}
              <Separator />
              <div className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground">Recently resolved</div>
              {closed.map(i => (
                <IncidentRowItem key={i.id} i={i} selected={selected?.id === i.id} onClick={() => setSelected(i)} dim />
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{selected ? selected.title : "Select an incident"}</CardTitle>
              {selected && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant={SEV_VARIANT[selected.severity]}>{selected.severity}</Badge>
                  <Badge variant="outline" className="gap-1">{STATUS_ICON[selected.status]} {selected.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    started {formatDistanceToNow(new Date(selected.started_at), { addSuffix: true })}
                  </span>
                  {selected.resolved_at && (
                    <span className="text-xs text-emerald-600">
                      MTTR {mttr(selected.started_at, selected.resolved_at)}
                    </span>
                  )}
                </div>
              )}
            </div>
            {selected && selected.status !== "resolved" && (
              <Button size="sm" variant="secondary" onClick={async () => {
                const r = await autoRespond({
                  triggerKind: "manual", payload: { incident_id: selected.id },
                  actor: me, title: selected.title, severity: selected.severity,
                });
                toast.success(`Matched ${r.matched} runbook${r.matched === 1 ? "" : "s"}`);
              }}>
                <Zap className="h-4 w-4 mr-1.5" />Auto-Respond
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="text-sm text-muted-foreground py-12 text-center">Pick an incident on the left to manage its lifecycle.</div>
            ) : (
              <IncidentDetail incident={selected} updates={updates} me={me} onChanged={load} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IncidentRowItem({ i, selected, onClick, dim }: { i: IncidentRow; selected: boolean; onClick: () => void; dim?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b hover:bg-accent transition-colors ${selected ? "bg-accent" : ""} ${dim ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{i.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(i.started_at), { addSuffix: true })}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={SEV_VARIANT[i.severity]} className="text-[10px]">{i.severity}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">{STATUS_ICON[i.status]}{i.status}</Badge>
        </div>
      </div>
    </button>
  );
}

function IncidentDetail({ incident, updates, me, onChanged }: { incident: IncidentRow; updates: Update[]; me: string; onChanged: () => void }) {
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setStatus(incident.status), [incident.id, incident.status]);

  const submit = async () => {
    if (!msg.trim()) { toast.error("Add an update message"); return; }
    setBusy(true);
    try {
      if (status === "resolved") await resolveIncident(incident.id, msg, me);
      else await postUpdate(incident.id, { status, message: msg, postedBy: me });
      setMsg(""); onChanged();
      toast.success("Update posted");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[280px] rounded-md border">
        <ol className="p-4 space-y-3">
          {updates.length === 0 && <li className="text-sm text-muted-foreground">No updates yet.</li>}
          {updates.map(u => (
            <li key={u.id} className="flex gap-3">
              <div className="mt-0.5">{STATUS_ICON[u.status]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{u.status}</Badge>
                  <Clock className="h-3 w-3" />{new Date(u.created_at).toLocaleString()}
                </div>
                <div className="text-sm mt-0.5 whitespace-pre-wrap break-words">{u.message}</div>
              </div>
            </li>
          ))}
        </ol>
      </ScrollArea>

      {incident.status !== "resolved" && (
        <div className="space-y-2 rounded-md border p-3 bg-muted/30">
          <div className="grid grid-cols-[160px_1fr] gap-2 items-center">
            <Label>Transition to</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as IncidentStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["investigating","identified","monitoring","resolved"] as IncidentStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="What changed? What's the impact? Next step?" rows={3} value={msg} onChange={e => setMsg(e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={busy}>{busy ? "Posting…" : status === "resolved" ? "Resolve incident" : "Post update"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeclareDialog({ me, onCreated }: { me: string; onCreated: () => void }) {
  const [openDlg, setOpenDlg] = useState(false);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<Severity>("minor");
  const [impact, setImpact] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      await declareIncident({ title: title.trim(), severity, impact: impact.trim() || undefined, isPublic, createdBy: me });
      setOpenDlg(false); setTitle(""); setImpact(""); setSeverity("minor"); setIsPublic(false);
      onCreated(); toast.success("Incident declared");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={openDlg} onOpenChange={setOpenDlg}>
      <DialogTrigger asChild>
        <Button size="sm"><Siren className="h-4 w-4 mr-1.5" />Declare incident</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Declare new incident</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Checkout 5xx spike" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Severity</Label>
              <Select value={severity} onValueChange={v => setSeverity(v as Severity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["info","minor","major","critical"] as Severity[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex flex-col"><Label>Public status page</Label>
              <div className="flex items-center gap-2 h-10"><Switch checked={isPublic} onCheckedChange={setIsPublic} /><span className="text-sm text-muted-foreground">{isPublic ? "Visible" : "Internal"}</span></div>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Impact</Label><Textarea rows={3} value={impact} onChange={e => setImpact(e.target.value)} placeholder="Who/what is affected?" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpenDlg(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Declaring…" : "Declare"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({ label, value, tone, icon }: { label: string; value: number; tone: "good"|"warn"|"danger"; icon: JSX.Element }) {
  const toneClass = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-600" : "text-emerald-600";
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
        </div>
        <div className={`${toneClass}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function mttr(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}
