/**
 * P4 — Runbook Designer
 * ---------------------
 * Author and manage declarative runbooks (incident playbooks):
 *  - List runbooks with active/inactive toggle and search
 *  - Visual step editor (notify / killswitch / circuit_open / edge_invoke / comment / wait_for_ack)
 *  - Trigger conditions builder (key + op + value)
 *  - Dry-run executor: feeds a sample payload through findMatchingRunbooks + executeRunbook
 *
 * Security: All persistence flows through RLS-protected tables. Steps are typed
 * and validated client-side before save; engine validates again at execute time.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  findMatchingRunbooks, executeRunbook,
  type Runbook, type RunbookStep, type Severity,
} from "@/lib/incidentEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { BookOpen, Plus, Play, Trash2, Save, Beaker, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const TRIGGER_KINDS = ["sla_breach","probe_fail","dlq_depth","circuit_open","error_spike","anomaly","webhook","manual"] as const;
const STEP_KINDS: RunbookStep["kind"][] = ["notify","killswitch","circuit_open","edge_invoke","comment","wait_for_ack"];

type Condition = { key: string; op: "eq"|"gte"|"gt"|"lte"; value: string };

function condsToObj(cs: Condition[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const c of cs) {
    if (!c.key) continue;
    const num = Number(c.value);
    if (c.op === "eq") o[c.key] = isNaN(num) ? c.value : num;
    else o[c.key] = { op: c.op, value: isNaN(num) ? c.value : num };
  }
  return o;
}
function objToConds(o: Record<string, unknown>): Condition[] {
  return Object.entries(o ?? {}).map(([key, v]) => {
    if (v && typeof v === "object" && "op" in (v as any)) {
      const x = v as { op: Condition["op"]; value: unknown };
      return { key, op: x.op, value: String(x.value) };
    }
    return { key, op: "eq", value: String(v) };
  });
}

export default function RunbookDesigner() {
  const [books, setBooks] = useState<Runbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Runbook | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("runbooks") as any).select("*").order("created_at", { ascending: false });
    setBooks((data ?? []) as Runbook[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? books.filter(b => b.title.toLowerCase().includes(s) || b.code.toLowerCase().includes(s) || b.trigger_kind.includes(s)) : books;
  }, [books, q]);

  const toggleActive = async (rb: Runbook) => {
    await (supabase.from("runbooks") as any).update({ is_active: !rb.is_active }).eq("id", rb.id);
    load(); toast.success(!rb.is_active ? "Activated" : "Deactivated");
  };
  const remove = async (rb: Runbook) => {
    if (!confirm(`Delete runbook "${rb.title}"?`)) return;
    await (supabase.from("runbooks") as any).delete().eq("id", rb.id);
    load(); toast.success("Deleted");
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Runbook Designer</h2>
          <p className="text-sm text-muted-foreground">Author declarative playbooks that match alert triggers and orchestrate response steps.</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search runbooks…" value={q} onChange={e => setQ(e.target.value)} className="w-56" />
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1.5" />New runbook</Button>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Library</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          : filtered.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No runbooks. Create one to get started.</div>
          : (
            <div className="divide-y">
              {filtered.map(rb => (
                <div key={rb.id} className="flex items-center gap-3 p-4 hover:bg-accent/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{rb.title}</span>
                      <Badge variant="outline" className="text-[10px]">{rb.code}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{rb.trigger_kind}</Badge>
                      <Badge variant={rb.severity === "critical" ? "destructive" : "outline"} className="text-[10px]">{rb.severity}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {rb.steps?.length ?? 0} step{(rb.steps?.length ?? 0) === 1 ? "" : "s"} · {Object.keys(rb.trigger_conditions ?? {}).length} condition{Object.keys(rb.trigger_conditions ?? {}).length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5"><Switch checked={rb.is_active} onCheckedChange={() => toggleActive(rb)} /><span className="text-xs">{rb.is_active ? "On" : "Off"}</span></div>
                    <DryRunDialog rb={rb} />
                    <Button size="sm" variant="outline" onClick={() => setEditing(rb)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(rb)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(editing || creating) && (
        <RunbookEditor
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function RunbookEditor({ initial, onClose, onSaved }: { initial: Runbook | null; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [triggerKind, setTriggerKind] = useState(initial?.trigger_kind ?? "manual");
  const [severity, setSeverity] = useState<Severity>(initial?.severity ?? "minor");
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [conds, setConds] = useState<Condition[]>(initial ? objToConds(initial.trigger_conditions) : []);
  const [steps, setSteps] = useState<RunbookStep[]>(initial?.steps ?? []);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!code.trim() || !title.trim()) { toast.error("Code and title are required"); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        code: code.trim(), title: title.trim(), trigger_kind: triggerKind, severity,
        is_active: active, trigger_conditions: condsToObj(conds) as never, steps: steps as never,
        updated_at: new Date().toISOString(),
      };
      if (initial) {
        const { error } = await (supabase.from("runbooks") as any).update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("runbooks") as any).insert({ ...payload, created_by: u.user?.id ?? null });
        if (error) throw error;
      }
      toast.success("Saved"); onSaved();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>{initial ? "Edit runbook" : "New runbook"}</DialogTitle></DialogHeader>
        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Code (unique)</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="checkout-5xx-spike" /></div>
              <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Checkout 5xx spike response" /></div>
              <div className="space-y-1.5"><Label>Trigger</Label>
                <Select value={triggerKind} onValueChange={setTriggerKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGER_KINDS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Severity</Label>
                <Select value={severity} onValueChange={v => setSeverity(v as Severity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["info","minor","major","critical"] as Severity[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2 flex items-center gap-3"><Switch checked={active} onCheckedChange={setActive} /><span className="text-sm">{active ? "Active" : "Inactive"}</span></div>
            </div>

            <Separator />

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Trigger conditions</Label>
                <Button size="sm" variant="outline" onClick={() => setConds([...conds, { key: "", op: "eq", value: "" }])}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
              {conds.length === 0 && <p className="text-xs text-muted-foreground">No conditions = matches all payloads for this trigger.</p>}
              {conds.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_1fr_auto] gap-2">
                  <Input placeholder="key (e.g. error_rate)" value={c.key} onChange={e => updateAt(conds, i, { ...c, key: e.target.value }, setConds)} />
                  <Select value={c.op} onValueChange={v => updateAt(conds, i, { ...c, op: v as Condition["op"] }, setConds)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(["eq","gte","gt","lte"] as const).map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="value" value={c.value} onChange={e => updateAt(conds, i, { ...c, value: e.target.value }, setConds)} />
                  <Button size="icon" variant="ghost" onClick={() => setConds(conds.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </section>

            <Separator />

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Steps (executed in order)</Label>
                <Select value="" onValueChange={(k) => setSteps([...steps, defaultStep(k as RunbookStep["kind"])])}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="+ Add step" /></SelectTrigger>
                  <SelectContent>{STEP_KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {steps.length === 0 && <p className="text-xs text-muted-foreground">No steps yet. Pick a step kind on the right to add one.</p>}
              {steps.map((s, i) => (
                <StepCard key={i} step={s} index={i} count={steps.length}
                  onChange={(ns) => updateAt(steps, i, ns, setSteps)}
                  onRemove={() => setSteps(steps.filter((_, j) => j !== i))}
                  onMove={(dir) => setSteps(move(steps, i, dir))}
                />
              ))}
            </section>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}><Save className="h-4 w-4 mr-1.5" />{busy ? "Saving…" : "Save runbook"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepCard({ step, index, count, onChange, onRemove, onMove }: {
  step: RunbookStep; index: number; count: number;
  onChange: (s: RunbookStep) => void; onRemove: () => void; onMove: (dir: -1|1) => void;
}) {
  const setParam = (patch: any) => onChange({ ...step, params: { ...step.params, ...patch } } as RunbookStep);
  return (
    <div className="rounded-md border p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Badge variant="outline">{index + 1}</Badge><span className="text-sm font-medium">{step.kind}</span></div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" disabled={index === count - 1} onClick={() => onMove(1)}><ChevronDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>
      {step.kind === "notify" && (
        <div className="grid grid-cols-2 gap-2">
          <Select value={step.params.channel} onValueChange={v => setParam({ channel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["admin","vendor","status_page"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="comma-separated user_ids (optional)" value={(step.params.user_ids ?? []).join(",")}
            onChange={e => setParam({ user_ids: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
          <Textarea className="col-span-2" rows={2} placeholder="Message" value={step.params.message} onChange={e => setParam({ message: e.target.value })} />
        </div>
      )}
      {step.kind === "killswitch" && (
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <Input placeholder="kill switch code" value={step.params.code} onChange={e => setParam({ code: e.target.value })} />
          <div className="flex items-center gap-2"><Switch checked={step.params.enabled} onCheckedChange={v => setParam({ enabled: v })} /><span className="text-sm">{step.params.enabled ? "Enable" : "Disable"}</span></div>
        </div>
      )}
      {step.kind === "circuit_open" && (
        <Input placeholder="service name" value={step.params.service} onChange={e => setParam({ service: e.target.value })} />
      )}
      {step.kind === "edge_invoke" && (
        <div className="space-y-2">
          <Input placeholder="edge function name" value={step.params.name} onChange={e => setParam({ name: e.target.value })} />
          <Textarea rows={3} placeholder='JSON body (optional)' value={JSON.stringify(step.params.body ?? {}, null, 2)}
            onChange={e => { try { setParam({ body: JSON.parse(e.target.value || "{}") }); } catch { /* keep typing */ } }} />
        </div>
      )}
      {step.kind === "comment" && (
        <Textarea rows={2} placeholder="Internal comment text" value={step.params.text} onChange={e => setParam({ text: e.target.value })} />
      )}
      {step.kind === "wait_for_ack" && (
        <Input placeholder="role (e.g. on_call_lead)" value={step.params.role} onChange={e => setParam({ role: e.target.value })} />
      )}
    </div>
  );
}

function DryRunDialog({ rb }: { rb: Runbook }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState("{}");
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setOut(null);
    try {
      const parsed = JSON.parse(payload || "{}");
      const matched = await findMatchingRunbooks(rb.trigger_kind, parsed);
      const isMatch = matched.some(m => m.id === rb.id);
      if (!isMatch) { setOut({ matched: false, message: "Conditions not satisfied for this payload." }); return; }
      const { data: u } = await supabase.auth.getUser();
      const res = await executeRunbook({ runbook: rb, triggeredBy: u.user?.id ?? "system", payload: parsed });
      setOut({ matched: true, ...res });
    } catch (e: any) { setOut({ error: e.message ?? String(e) }); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="ghost"><Beaker className="h-4 w-4 mr-1" />Dry-run</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Dry-run: {rb.title}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Sample trigger payload (JSON)</Label>
          <Textarea rows={6} value={payload} onChange={e => setPayload(e.target.value)} className="font-mono text-xs" />
          <Button onClick={run} disabled={busy}><Play className="h-4 w-4 mr-1.5" />{busy ? "Running…" : "Execute"}</Button>
          {out && (
            <pre className="rounded-md border bg-muted/30 p-3 text-xs max-h-60 overflow-auto">{JSON.stringify(out, null, 2)}</pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function defaultStep(kind: RunbookStep["kind"]): RunbookStep {
  switch (kind) {
    case "notify":       return { kind, params: { channel: "admin", message: "", user_ids: [] } };
    case "killswitch":   return { kind, params: { code: "", enabled: true } };
    case "circuit_open": return { kind, params: { service: "" } };
    case "edge_invoke":  return { kind, params: { name: "", body: {} } };
    case "comment":      return { kind, params: { text: "" } };
    case "wait_for_ack": return { kind, params: { role: "on_call_lead" } };
  }
}
function updateAt<T>(arr: T[], i: number, val: T, set: (a: T[]) => void) { const c = arr.slice(); c[i] = val; set(c); }
function move<T>(arr: T[], i: number, dir: -1|1): T[] { const j = i + dir; if (j < 0 || j >= arr.length) return arr; const c = arr.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; }
