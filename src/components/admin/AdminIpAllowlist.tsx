import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Trash2, Pencil, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type Rule = {
  id: string; cidr: string; label: string; description: string | null;
  is_active: boolean; expires_at: string | null; created_at: string;
};

const EMPTY: Partial<Rule> = { cidr: "", label: "", description: "", is_active: true, expires_at: null };

export function AdminIpAllowlist() {
  const { toast } = useToast();
  const [items, setItems] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("admin_ip_allowlist").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setItems((data as Rule[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing({ ...EMPTY }); setOpen(true); };
  const startEdit = (r: Rule) => { setEditing(r); setOpen(true); };

  const save = async () => {
    if (!editing?.cidr?.trim() || !editing?.label?.trim()) {
      return toast({ title: "CIDR and label required", variant: "destructive" });
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_upsert_ip_allowlist" as any, {
      _id: (editing as Rule).id || null,
      _cidr: editing.cidr!.trim(),
      _label: editing.label!.trim(),
      _description: editing.description || null,
      _is_active: editing.is_active ?? true,
      _expires_at: editing.expires_at || null,
    });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Rule saved" });
    setOpen(false); load();
  };

  const toggle = async (r: Rule) => {
    const { error } = await supabase.rpc("admin_toggle_ip_allowlist" as any, { _id: r.id, _is_active: !r.is_active });
    if (error) return toast({ title: "Toggle failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (r: Rule) => {
    if (!confirm(`Delete "${r.label}"?`)) return;
    const { error } = await supabase.rpc("admin_delete_ip_allowlist" as any, { _id: r.id });
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" }); load();
  };

  const activeCount = items.filter(r => r.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Admin IP Allowlist</h1>
          <p className="text-muted-foreground">Restrict admin access to trusted CIDR ranges.</p>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New Rule</Button>
      </div>

      {activeCount === 0 && items.length === 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <p>No active rules — allowlist is currently <strong>open</strong> for all IPs.
            Add at least one rule before enforcing on edge functions.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Rules</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No rules.</p>
          ) : (
            <div className="space-y-2">
              {items.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">{r.cidr}</span>
                      <Badge variant="outline">{r.label}</Badge>
                      {!r.is_active && <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>}
                      {r.expires_at && new Date(r.expires_at) < new Date() && <Badge variant="destructive">Expired</Badge>}
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                    {r.expires_at && <p className="text-xs text-muted-foreground mt-1">Expires {format(new Date(r.expires_at), "PP p")}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
                    <Button size="icon" variant="outline" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{(editing as Rule)?.id ? "Edit Rule" : "New IP Rule"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>CIDR</Label>
                <Input placeholder="203.0.113.0/24 or 198.51.100.42/32"
                       value={editing.cidr || ""}
                       onChange={(e) => setEditing(p => ({ ...p!, cidr: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input placeholder="HQ office"
                       value={editing.label || ""}
                       onChange={(e) => setEditing(p => ({ ...p!, label: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ""}
                          onChange={(e) => setEditing(p => ({ ...p!, description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Expires at (optional)</Label>
                <Input type="datetime-local"
                       value={editing.expires_at ? new Date(editing.expires_at).toISOString().slice(0,16) : ""}
                       onChange={(e) => setEditing(p => ({ ...p!, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
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

export default AdminIpAllowlist;
