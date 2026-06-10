import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertOctagon, CheckCircle2, Plus, RefreshCw, Send, Siren, Eye, EyeOff } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Severity = "minor" | "major" | "critical" | "maintenance";
type Status = "investigating" | "identified" | "monitoring" | "resolved";

type Incident = {
  id: string;
  title: string;
  severity: Severity;
  status: Status;
  affected_services: string[];
  impact: string;
  public_summary: string;
  is_public: boolean;
  started_at: string;
  resolved_at: string | null;
  updated_at: string;
};

type Update = {
  id: string;
  incident_id: string;
  status: Status;
  message: string;
  posted_at: string;
};

const sevTone: Record<Severity, BadgeProps["variant"]> = {
  minor: "secondary",
  major: "default",
  critical: "destructive",
  maintenance: "outline",
};
const statusTone: Record<Status, BadgeProps["variant"]> = {
  investigating: "destructive",
  identified: "default",
  monitoring: "secondary",
  resolved: "outline",
};

type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

export function IncidentManagementPanel() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [updatesById, setUpdatesById] = useState<Record<string, Update[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", severity: "minor" as Severity, impact: "", public_summary: "",
    affected_services: "", is_public: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [updateDraft, setUpdateDraft] = useState({ status: "investigating" as Status, message: "" });
  const rpc = supabase as unknown as RpcClient;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("incidents").select("*").order("started_at", { ascending: false }).limit(100);
    setIncidents((data ?? []) as Incident[]);
    setLoading(false);
  }, []);

  const loadUpdates = useCallback(async (id: string) => {
    const { data } = await supabase.from("incident_updates").select("*").eq("incident_id", id).order("posted_at", { ascending: false });
    setUpdatesById((m) => ({ ...m, [id]: (data ?? []) as Update[] }));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selected) loadUpdates(selected); }, [selected, loadUpdates]);

  const counts = useMemo(() => incidents.reduce((acc, i) => {
    if (i.status === "resolved") acc.resolved++; else acc.active++;
    if (i.severity === "critical" && i.status !== "resolved") acc.critical++;
    return acc;
  }, { active: 0, resolved: 0, critical: 0 }), [incidents]);

  const create = async () => {
    if (form.title.trim().length < 3) return toast.error("Title required");
    setSubmitting(true);
    const services = form.affected_services.split(",").map(s => s.trim()).filter(Boolean);
    const { error } = await rpc.rpc("admin_create_incident", {
      _title: form.title, _severity: form.severity, _impact: form.impact,
      _public_summary: form.public_summary, _affected_services: services,
      _is_public: form.is_public, _source_alert_id: null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Incident opened");
    setOpen(false);
    setForm({ title: "", severity: "minor", impact: "", public_summary: "", affected_services: "", is_public: true });
    load();
  };

  const postUpdate = async () => {
    if (!selected || updateDraft.message.trim().length < 3) return toast.error("Message required");
    const { error } = await rpc.rpc("admin_post_incident_update", {
      _incident_id: selected, _status: updateDraft.status, _message: updateDraft.message,
    });
    if (error) return toast.error(error.message);
    toast.success(updateDraft.status === "resolved" ? "Incident resolved" : "Update posted");
    setUpdateDraft({ status: updateDraft.status, message: "" });
    loadUpdates(selected);
    load();
  };

  const selectedIncident = incidents.find(i => i.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Siren className="w-6 h-6 text-primary" /> Incident Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Declare incidents, post timeline updates, and resolve — feeds the public status page.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Declare Incident</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Declare Incident</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={140} placeholder="Payment failures on Razorpay" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Severity</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as Severity })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem><SelectItem value="major">Major</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div className="flex items-end justify-between gap-2 pb-1">
                    <Label>Public</Label>
                    <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
                  </div>
                </div>
                <div><Label>Affected services (comma separated)</Label><Input value={form.affected_services} onChange={(e) => setForm({ ...form, affected_services: e.target.value })} placeholder="checkout, payments" /></div>
                <div><Label>Internal impact</Label><Textarea value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} maxLength={500} /></div>
                <div><Label>Public summary</Label><Textarea value={form.public_summary} onChange={(e) => setForm({ ...form, public_summary: e.target.value })} maxLength={500} placeholder="Some customers may experience checkout failures." /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? "Opening..." : "Open Incident"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {([["Active", counts.active, AlertOctagon], ["Critical", counts.critical, Siren], ["Resolved", counts.resolved, CheckCircle2]] as const).map(([label, value, Icon]) => (
          <Card key={label} className="p-4"><div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Icon className="w-4 h-4" />{label}</div><div className="text-3xl font-bold mt-1">{value}</div></Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Incidents</div>
          {loading && incidents.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            : incidents.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No incidents recorded.</div>
            : <div className="divide-y max-h-[760px] overflow-auto">
                {incidents.map((i, idx) => (
                  <motion.button key={i.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.015 }}
                    onClick={() => setSelected(i.id)}
                    className={cn("w-full text-left p-4 hover:bg-muted/50 transition-colors", selected === i.id && "bg-muted")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium truncate">{i.title}</div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant={sevTone[i.severity]}>{i.severity}</Badge>
                        <Badge variant={statusTone[i.status]}>{i.status}</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span>{formatDistanceToNow(new Date(i.started_at), { addSuffix: true })}</span>
                      {i.affected_services.length > 0 && <span className="font-mono">{i.affected_services.join(", ")}</span>}
                      {i.is_public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </div>
                  </motion.button>
                ))}
              </div>}
        </Card>

        <Card className="p-4">
          {!selectedIncident ? <div className="p-8 text-center text-sm text-muted-foreground">Select an incident to view its timeline.</div>
            : <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold">{selectedIncident.title}</h3>
                    <Badge variant={sevTone[selectedIncident.severity]}>{selectedIncident.severity}</Badge>
                    <Badge variant={statusTone[selectedIncident.status]}>{selectedIncident.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{selectedIncident.public_summary || selectedIncident.impact || "No summary."}</p>
                  <div className="text-xs text-muted-foreground mt-1">Started {format(new Date(selectedIncident.started_at), "MMM d, HH:mm")}{selectedIncident.resolved_at && ` · resolved ${format(new Date(selectedIncident.resolved_at), "MMM d, HH:mm")}`}</div>
                </div>

                {selectedIncident.status !== "resolved" && (
                  <div className="space-y-2 border rounded-lg p-3">
                    <div className="font-medium text-sm">Post update</div>
                    <Select value={updateDraft.status} onValueChange={(v) => setUpdateDraft({ ...updateDraft, status: v as Status })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="identified">Identified</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea value={updateDraft.message} onChange={(e) => setUpdateDraft({ ...updateDraft, message: e.target.value })} placeholder="Root cause identified, rolling out fix..." maxLength={1000} />
                    <Button size="sm" onClick={postUpdate}><Send className="w-4 h-4 mr-1" /> Post update</Button>
                  </div>
                )}

                <div>
                  <div className="font-medium text-sm mb-2">Timeline</div>
                  <div className="space-y-3">
                    {(updatesById[selectedIncident.id] ?? []).map((u) => (
                      <div key={u.id} className="border-l-2 pl-3 py-1">
                        <div className="flex items-center gap-2 text-xs"><Badge variant={statusTone[u.status]}>{u.status}</Badge><span className="text-muted-foreground">{format(new Date(u.posted_at), "MMM d, HH:mm")}</span></div>
                        <div className="text-sm mt-1 whitespace-pre-wrap">{u.message}</div>
                      </div>
                    ))}
                    {(updatesById[selectedIncident.id] ?? []).length === 0 && <div className="text-xs text-muted-foreground">No updates yet.</div>}
                  </div>
                </div>
              </div>}
        </Card>
      </div>
    </div>
  );
}
