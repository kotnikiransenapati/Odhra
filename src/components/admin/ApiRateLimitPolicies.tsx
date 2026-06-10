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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Gauge, Plus, Trash2, Pencil, Loader2 } from "lucide-react";

type Policy = {
  id: string;
  name: string;
  scope: string;
  endpoint_pattern: string | null;
  window_seconds: number;
  max_requests: number;
  burst_multiplier: number;
  action: string;
  is_active: boolean;
  description: string | null;
};

const EMPTY: Partial<Policy> = {
  name: "",
  scope: "global",
  endpoint_pattern: "",
  window_seconds: 60,
  max_requests: 60,
  burst_multiplier: 1.5,
  action: "throttle",
  is_active: true,
  description: "",
};

export function ApiRateLimitPolicies() {
  const { toast } = useToast();
  const [items, setItems] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Policy> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("api_rate_limit_policies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setItems((data as Policy[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing({ ...EMPTY }); setOpen(true); };
  const startEdit = (p: Policy) => { setEditing(p); setOpen(true); };

  const save = async () => {
    if (!editing?.name?.trim()) return toast({ title: "Name required", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.rpc("admin_upsert_rate_limit_policy" as any, {
      _id: (editing as Policy).id || null,
      _name: editing.name!.trim(),
      _scope: editing.scope || "global",
      _endpoint_pattern: editing.endpoint_pattern || null,
      _window_seconds: Number(editing.window_seconds) || 60,
      _max_requests: Number(editing.max_requests) || 60,
      _burst_multiplier: Number(editing.burst_multiplier) || 1.5,
      _action: editing.action || "throttle",
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
    const { error } = await supabase.rpc("admin_toggle_rate_limit_policy" as any, { _id: p.id, _is_active: !p.is_active });
    if (error) return toast({ title: "Toggle failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (p: Policy) => {
    if (!confirm(`Delete policy "${p.name}"?`)) return;
    const { error } = await supabase.rpc("admin_delete_rate_limit_policy" as any, { _id: p.id });
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Policy deleted" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Gauge className="h-6 w-6" /> API Rate Limit Policies</h1>
          <p className="text-muted-foreground">Configure throttle/block rules per endpoint, user, or IP.</p>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New Policy</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Policies</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No policies defined.</p>
          ) : (
            <div className="space-y-2">
              {items.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{p.name}</span>
                      <Badge variant="outline" className="capitalize">{p.scope}</Badge>
                      <Badge variant="secondary" className="capitalize">{p.action}</Badge>
                      {!p.is_active && <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.max_requests} req / {p.window_seconds}s · burst ×{p.burst_multiplier}
                      {p.endpoint_pattern && ` · ${p.endpoint_pattern}`}
                    </p>
                    {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_active} onCheckedChange={() => toggle(p)} />
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
            <DialogTitle>{(editing as Policy)?.id ? "Edit Policy" : "New Policy"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing(p => ({ ...p!, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Scope</Label>
                  <Select value={editing.scope || "global"} onValueChange={(v) => setEditing(p => ({ ...p!, scope: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="endpoint">Endpoint</SelectItem>
                      <SelectItem value="user">Per User</SelectItem>
                      <SelectItem value="ip">Per IP</SelectItem>
                      <SelectItem value="vendor">Per Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Action</Label>
                  <Select value={editing.action || "throttle"} onValueChange={(v) => setEditing(p => ({ ...p!, action: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="throttle">Throttle (429)</SelectItem>
                      <SelectItem value="block">Block</SelectItem>
                      <SelectItem value="log_only">Log only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Endpoint Pattern (optional)</Label>
                <Input placeholder="/api/v1/*" value={editing.endpoint_pattern || ""}
                       onChange={(e) => setEditing(p => ({ ...p!, endpoint_pattern: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Max Requests</Label>
                  <Input type="number" min={1} value={editing.max_requests || 0}
                         onChange={(e) => setEditing(p => ({ ...p!, max_requests: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Window (s)</Label>
                  <Input type="number" min={1} value={editing.window_seconds || 0}
                         onChange={(e) => setEditing(p => ({ ...p!, window_seconds: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Burst ×</Label>
                  <Input type="number" step="0.1" min={1} value={editing.burst_multiplier || 1}
                         onChange={(e) => setEditing(p => ({ ...p!, burst_multiplier: Number(e.target.value) }))} />
                </div>
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

export default ApiRateLimitPolicies;
