import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Database, HardDrive, RotateCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";

type Snapshot = {
  id: string;
  label: string;
  snapshot_type: string;
  status: string;
  size_bytes: number | null;
  notes: string | null;
  created_at: string;
  expires_at: string | null;
  restored_at: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  running: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  failed: "bg-destructive/15 text-destructive",
  restored: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  expired: "bg-muted text-muted-foreground",
};

function formatBytes(n: number | null) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function BackupSnapshotsRegistry() {
  const { toast } = useToast();
  const [items, setItems] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ label: "", snapshot_type: "logical", retention_days: 30, notes: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("backup_snapshots")
      .select("id,label,snapshot_type,status,size_bytes,notes,created_at,expires_at,restored_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast({ title: "Failed to load snapshots", description: error.message, variant: "destructive" });
    setItems((data as Snapshot[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const register = async () => {
    if (!form.label.trim()) return toast({ title: "Label required", variant: "destructive" });
    setSubmitting(true);
    const { error } = await supabase.rpc("admin_register_backup_snapshot" as any, {
      _label: form.label.trim(),
      _snapshot_type: form.snapshot_type,
      _scope: {},
      _retention_days: Number(form.retention_days) || 30,
      _notes: form.notes.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast({ title: "Register failed", description: error.message, variant: "destructive" });
    toast({ title: "Snapshot registered" });
    setForm({ label: "", snapshot_type: "logical", retention_days: 30, notes: "" });
    load();
  };

  const markRestored = async (id: string) => {
    const { error } = await supabase.rpc("admin_mark_backup_restored" as any, { _snapshot_id: id, _notes: null });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Marked restored" });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><HardDrive className="h-6 w-6" /> Backup Snapshots</h1>
        <p className="text-muted-foreground">Track database backup snapshots and restoration history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Register New Snapshot</CardTitle>
          <CardDescription>Record a new backup entry. Actual backup execution runs out-of-band.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} placeholder="nightly-2026-06-10" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.snapshot_type} onValueChange={(v) => setForm(f => ({ ...f, snapshot_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="logical">Logical</SelectItem>
                <SelectItem value="schema">Schema only</SelectItem>
                <SelectItem value="data">Data only</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Retention (days)</Label>
            <Input type="number" min={1} max={365} value={form.retention_days}
                   onChange={(e) => setForm(f => ({ ...f, retention_days: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={register} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Database className="h-4 w-4 mr-2" /> Register Snapshot
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshot History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No snapshots yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{s.label}</span>
                      <Badge variant="outline" className="capitalize">{s.snapshot_type}</Badge>
                      <Badge className={STATUS_COLOR[s.status] || ""}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(s.created_at), "PP p")} · Size {formatBytes(s.size_bytes)}
                      {s.expires_at && ` · Expires ${format(new Date(s.expires_at), "PP")}`}
                    </p>
                    {s.notes && <p className="text-xs mt-1 text-muted-foreground">{s.notes}</p>}
                  </div>
                  {s.status !== "restored" && s.status !== "expired" && (
                    <Button size="sm" variant="outline" onClick={() => markRestored(s.id)}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Mark restored
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BackupSnapshotsRegistry;
