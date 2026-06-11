import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Database, Plus, Trash2, Pencil, Loader2, Play, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type Policy = {
  id: string;
  table_name: string;
  retention_days: number;
  date_column: string;
  delete_mode: "hard" | "soft";
  soft_delete_column: string | null;
  filter_expression: string | null;
  is_active: boolean;
  description: string | null;
  last_run_at: string | null;
  last_purged_count: number | null;
  last_error: string | null;
};

const ALLOWED_TABLES = [
  "analytics_events","error_logs","webhook_events","audit_logs",
  "user_behavior_events","cart_abandonment_events","campaign_link_events",
  "email_campaign_logs","admin_audit_log","admin_session_activity",
  "edge_function_metrics","system_heartbeats","dead_letter_queue",
  "mutation_idempotency","rate_limits","otp_verifications",
  "shipment_events","order_activity_log","price_history",
  "banner_ab_analytics","fraud_signals","spin_wheel_entries",
];

const EMPTY: Partial<Policy> = {
  table_name: "analytics_events",
  retention_days: 90,
  date_column: "created_at",
  delete_mode: "hard",
  soft_delete_column: "",
  filter_expression: "",
  is_active: true,
  description: "",
};

export function DataRetentionPolicies() {
  const { toast } = useToast();
  const [items, setItems] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Policy> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("data_retention_policies")
      .select("*")
      .order("table_name");
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setItems((data as Policy[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing({ ...EMPTY }); setOpen(true); };
  const startEdit = (p: Policy) => { setEditing(p); setOpen(true); };

  const save = async () => {
    if (!editing?.table_name) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_upsert_retention_policy" as any, {
      _id: (editing as Policy).id || null,
      _table_name: editing.table_name!,
      _retention_days: Number(editing.retention_days) || 90,
      _date_column: editing.date_column || "created_at",
      _delete_mode: editing.delete_mode || "hard",
      _soft_delete_column: editing.soft_delete_column || null,
      _filter_expression: editing.filter_expression || null,
      _is_active: editing.is_active ?? true,
      _description: editing.description || null,
    });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Policy saved" });
    setOpen(false);
    load();
  };

  const toggle = async (p: Policy) => {
    const { error } = await supabase.rpc("admin_toggle_retention_policy" as any, { _id: p.id, _is_active: !p.is_active });
    if (error) return toast({ title: "Toggle failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (p: Policy) => {
    if (!confirm(`Delete retention policy for ${p.table_name}?`)) return;
    const { error } = await supabase.rpc("admin_delete_retention_policy" as any, { _id: p.id });
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  const runNow = async (p: Policy) => {
    if (!confirm(`Run retention for ${p.table_name} now? This will purge records older than ${p.retention_days} days.`)) return;
    setRunning(p.id);
    const { data, error } = await supabase.rpc("admin_run_retention_policy" as any, { _id: p.id });
    setRunning(null);
    if (error) return toast({ title: "Run failed", description: error.message, variant: "destructive" });
    toast({ title: `Purged ${data ?? 0} rows from ${p.table_name}` });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-6 w-6" /> Data Retention Policies</h1>
          <p className="text-muted-foreground">Automated purging of historical records per table.</p>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New Policy</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Policies</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No policies configured.</p>
          ) : (
            <div className="space-y-2">
              {items.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium truncate">{p.table_name}</span>
                      <Badge variant="outline">{p.retention_days}d</Badge>
                      <Badge variant="secondary" className="capitalize">{p.delete_mode}</Badge>
                      {!p.is_active && <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>}
                      {p.last_error && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />error</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Column <code>{p.date_column}</code>
                      {p.last_run_at && ` · Last run ${format(new Date(p.last_run_at), "PP p")} (purged ${p.last_purged_count ?? 0})`}
                    </p>
                    {p.last_error && <p className="text-xs text-destructive mt-1 truncate">{p.last_error}</p>}
                    {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_active} onCheckedChange={() => toggle(p)} />
                    <Button size="icon" variant="outline" onClick={() => runNow(p)} disabled={running === p.id}>
                      {running === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{(editing as Policy)?.id ? "Edit Policy" : "New Retention Policy"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Table</Label>
                <Select value={editing.table_name} onValueChange={(v) => setEditing(p => ({ ...p!, table_name: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALLOWED_TABLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Retention (days)</Label>
                  <Input type="number" min={1} value={editing.retention_days || 0}
                         onChange={(e) => setEditing(p => ({ ...p!, retention_days: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date Column</Label>
                  <Input value={editing.date_column || "created_at"}
                         onChange={(e) => setEditing(p => ({ ...p!, date_column: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={editing.delete_mode} onValueChange={(v) => setEditing(p => ({ ...p!, delete_mode: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hard">Hard delete</SelectItem>
                      <SelectItem value="soft">Soft delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editing.delete_mode === "soft" && (
                  <div className="space-y-1.5">
                    <Label>Soft column</Label>
                    <Input value={editing.soft_delete_column || ""}
                           onChange={(e) => setEditing(p => ({ ...p!, soft_delete_column: e.target.value }))}
                           placeholder="deleted_at" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ""}
                          onChange={(e) => setEditing(p => ({ ...p!, description: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing(p => ({ ...p!, is_active: v }))} />
                <Label className="cursor-pointer">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DataRetentionPolicies;
