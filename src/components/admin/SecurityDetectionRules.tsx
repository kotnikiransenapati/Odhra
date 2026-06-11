import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Plus, RefreshCw, Siren, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Rule = {
  id: string;
  name: string;
  description: string | null;
  source: string | null;
  event_type: string;
  window_minutes: number;
  threshold: number;
  group_by: "actor_id" | "ip" | "fingerprint_hash" | "correlation_id" | "country_code" | "global";
  severity: "low" | "medium" | "high" | "critical";
  active: boolean;
  cooldown_minutes: number;
  last_triggered_at: string | null;
};

type Finding = {
  id: string;
  rule_id: string;
  rule_name: string;
  group_key: string;
  severity: Rule["severity"];
  event_count: number;
  window_started_at: string;
  window_ended_at: string;
  status: "open" | "acknowledged" | "resolved";
  metadata: Record<string, unknown>;
  created_at: string;
};

const blank = (): Partial<Rule> => ({
  name: "",
  description: "",
  source: "",
  event_type: "login_failed",
  window_minutes: 15,
  threshold: 5,
  group_by: "actor_id",
  severity: "medium",
  active: true,
  cooldown_minutes: 60,
});

const severityVariant: Record<Rule["severity"], "default" | "destructive" | "outline" | "secondary"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export function SecurityDetectionRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [findingStatus, setFindingStatus] = useState("open");
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [rulesResult, findingsResult] = await Promise.all([
      supabase.rpc("admin_security_rules_list" as any),
      supabase.rpc("admin_security_findings" as any, { _status: findingStatus === "all" ? null : findingStatus, _limit: 100 }),
    ]);
    if (rulesResult.error) toast({ title: "Rules failed", description: rulesResult.error.message, variant: "destructive" });
    if (findingsResult.error) toast({ title: "Findings failed", description: findingsResult.error.message, variant: "destructive" });
    setRules(((rulesResult.data as unknown) as Rule[]) || []);
    setFindings(((findingsResult.data as unknown) as Finding[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findingStatus]);

  const saveRule = async () => {
    if (!editing?.name?.trim() || !editing?.event_type?.trim()) {
      return toast({ title: "Name and event type required", variant: "destructive" });
    }

    const { error } = await supabase.rpc("admin_upsert_security_rule" as any, {
      _id: editing.id || null,
      _name: editing.name.trim(),
      _description: editing.description?.trim() || null,
      _source: editing.source?.trim() || null,
      _event_type: editing.event_type.trim().toLowerCase(),
      _window_minutes: Number(editing.window_minutes || 15),
      _threshold: Number(editing.threshold || 5),
      _group_by: editing.group_by || "actor_id",
      _severity: editing.severity || "medium",
      _active: editing.active ?? true,
      _cooldown_minutes: Number(editing.cooldown_minutes || 60),
    });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing.id ? "Rule updated" : "Rule created" });
    setEditing(null);
    load();
  };

  const deleteRule = async (rule: Rule) => {
    if (!confirm(`Delete detection rule "${rule.name}"?`)) return;
    const { error } = await supabase.rpc("admin_delete_security_rule" as any, { _id: rule.id });
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Rule deleted" });
    load();
  };

  const evaluate = async () => {
    setEvaluating(true);
    const { data, error } = await supabase.rpc("evaluate_security_detection_rules" as any);
    setEvaluating(false);
    if (error) return toast({ title: "Evaluation failed", description: error.message, variant: "destructive" });
    toast({ title: "Detection run complete", description: `${(data as any)?.created_findings ?? 0} new findings` });
    load();
  };

  const updateFinding = async (finding: Finding, status: "acknowledged" | "resolved") => {
    const { error } = await supabase.rpc("admin_update_security_finding_status" as any, { _id: finding.id, _status: status });
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: status === "acknowledged" ? "Finding acknowledged" : "Finding resolved" });
    load();
  };

  const openFindings = findings.filter((f) => f.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Siren className="h-6 w-6" /> Security Detection Rules</h1>
          <p className="text-muted-foreground">Threshold correlation rules that turn repeated security events into actionable findings.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh detection rules"><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={evaluate} disabled={evaluating}>
            {evaluating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            Run detection
          </Button>
          <Button onClick={() => setEditing(blank())}><Plus className="h-4 w-4 mr-2" /> New rule</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Rules</p><p className="text-2xl font-bold mt-1">{loading ? "…" : rules.filter(r => r.active).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open Findings</p><p className="text-2xl font-bold mt-1">{loading ? "…" : openFindings}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Critical Rules</p><p className="text-2xl font-bold mt-1">{loading ? "…" : rules.filter(r => r.severity === "critical").length}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Rules</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" />Loading…</div>
              : rules.length === 0 ? <p className="text-sm text-muted-foreground py-4">No detection rules.</p>
              : <div className="space-y-2 max-h-[620px] overflow-y-auto">
                  {rules.map((rule) => (
                    <div key={rule.id} className="p-3 rounded border hover:bg-muted/30 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{rule.name}</span>
                            <Badge variant={severityVariant[rule.severity]}>{rule.severity.toUpperCase()}</Badge>
                            {!rule.active && <Badge variant="outline">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {rule.threshold}+ <code>{rule.event_type}</code> in {rule.window_minutes}m grouped by {rule.group_by}
                            {rule.source && ` · ${rule.source}`}
                          </p>
                          {rule.last_triggered_at && <p className="text-xs text-muted-foreground mt-1">last triggered {formatDistanceToNow(new Date(rule.last_triggered_at), { addSuffix: true })}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => setEditing(rule)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteRule(rule)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                      {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    </div>
                  ))}
                </div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Findings</CardTitle>
            <select className="bg-background border rounded-md px-3 text-sm h-9" value={findingStatus} onChange={(e) => setFindingStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
          </CardHeader>
          <CardContent>
            {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" />Loading…</div>
              : findings.length === 0 ? <p className="text-sm text-muted-foreground py-4">No findings.</p>
              : <div className="space-y-2 max-h-[620px] overflow-y-auto">
                  {findings.map((finding) => (
                    <div key={finding.id} className="p-3 rounded border hover:bg-muted/30 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={severityVariant[finding.severity]}>{finding.severity.toUpperCase()}</Badge>
                            <Badge variant={finding.status === "open" ? "secondary" : "outline"}>{finding.status.toUpperCase()}</Badge>
                            <span className="font-medium truncate">{finding.rule_name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {finding.event_count} events for <code>{finding.group_key}</code> · {formatDistanceToNow(new Date(finding.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {finding.status !== "resolved" && (
                          <div className="flex gap-1 shrink-0">
                            {finding.status === "open" && <Button size="sm" variant="outline" onClick={() => updateFinding(finding, "acknowledged")}>Acknowledge</Button>}
                            <Button size="sm" variant="outline" onClick={() => updateFinding(finding, "resolved")}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit detection rule" : "Create detection rule"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Source</Label><Input value={editing.source || ""} onChange={(e) => setEditing({ ...editing, source: e.target.value })} placeholder="auth, api, checkout" /></div>
              <div className="space-y-1.5"><Label>Event type</Label><Input value={editing.event_type || ""} onChange={(e) => setEditing({ ...editing, event_type: e.target.value })} placeholder="login_failed" /></div>
              <div className="space-y-1.5"><Label>Window minutes</Label><Input type="number" min={1} value={editing.window_minutes || 15} onChange={(e) => setEditing({ ...editing, window_minutes: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Threshold</Label><Input type="number" min={1} value={editing.threshold || 5} onChange={(e) => setEditing({ ...editing, threshold: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Group by</Label><select className="bg-background border rounded-md px-3 h-9 w-full text-sm" value={editing.group_by || "actor_id"} onChange={(e) => setEditing({ ...editing, group_by: e.target.value as Rule["group_by"] })}>{["actor_id", "ip", "fingerprint_hash", "correlation_id", "country_code", "global"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
              <div className="space-y-1.5"><Label>Severity</Label><select className="bg-background border rounded-md px-3 h-9 w-full text-sm" value={editing.severity || "medium"} onChange={(e) => setEditing({ ...editing, severity: e.target.value as Rule["severity"] })}>{["low", "medium", "high", "critical"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
              <div className="space-y-1.5"><Label>Cooldown minutes</Label><Input type="number" min={1} value={editing.cooldown_minutes || 60} onChange={(e) => setEditing({ ...editing, cooldown_minutes: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between rounded border px-3 py-2"><Label>Active</Label><Switch checked={editing.active ?? true} onCheckedChange={(value) => setEditing({ ...editing, active: value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveRule}>Save rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SecurityDetectionRules;