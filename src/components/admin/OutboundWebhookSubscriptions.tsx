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
import { Webhook, Plus, Trash2, Pencil, Loader2, KeyRound, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type Sub = {
  id: string; name: string; target_url: string; event_types: string[];
  is_active: boolean; max_retries: number; timeout_ms: number; description: string | null;
  last_delivery_at: string | null; last_delivery_status: string | null;
  consecutive_failures: number; secret: string;
};

const EMPTY: Partial<Sub> = {
  name: "", target_url: "https://", event_types: [], is_active: true,
  max_retries: 5, timeout_ms: 10000, description: "",
};

export function OutboundWebhookSubscriptions() {
  const { toast } = useToast();
  const [items, setItems] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Sub> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("outbound_webhook_subscriptions").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setItems((data as Sub[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing({ ...EMPTY }); setOpen(true); };
  const startEdit = (s: Sub) => { setEditing({ ...s }); setOpen(true); };

  const save = async () => {
    if (!editing?.name || !editing?.target_url?.startsWith("https://")) {
      return toast({ title: "Name and https URL required", variant: "destructive" });
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_upsert_webhook_subscription" as any, {
      _id: (editing as Sub).id || null,
      _name: editing.name,
      _target_url: editing.target_url,
      _event_types: editing.event_types || [],
      _secret: null, // never overwrite from UI
      _is_active: editing.is_active ?? true,
      _max_retries: Number(editing.max_retries) || 5,
      _timeout_ms: Number(editing.timeout_ms) || 10000,
      _headers: {},
      _description: editing.description || null,
    });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Subscription saved" });
    setOpen(false); load();
  };

  const toggle = async (s: Sub) => {
    const { error } = await supabase.rpc("admin_toggle_webhook_subscription" as any, { _id: s.id, _is_active: !s.is_active });
    if (error) return toast({ title: "Toggle failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (s: Sub) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    const { error } = await supabase.rpc("admin_delete_webhook_subscription" as any, { _id: s.id });
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };

  const rotate = async (s: Sub) => {
    if (!confirm(`Rotate signing secret for "${s.name}"? Existing integrations will break until updated.`)) return;
    const { data, error } = await supabase.rpc("admin_rotate_webhook_secret" as any, { _id: s.id });
    if (error) return toast({ title: "Rotation failed", description: error.message, variant: "destructive" });
    setRevealedSecret(data as string);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="h-6 w-6" /> Outbound Webhooks</h1>
          <p className="text-muted-foreground">Deliver events to external systems with HMAC-signed payloads.</p>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New Subscription</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Subscriptions</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No subscriptions.</p>
          ) : (
            <div className="space-y-2">
              {items.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{s.name}</span>
                      {!s.is_active && <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>}
                      {s.consecutive_failures >= 3 && (
                        <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{s.consecutive_failures} failures</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{s.target_url}</p>
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      {(s.event_types || []).map(ev => <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>)}
                    </div>
                    {s.last_delivery_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last delivery {format(new Date(s.last_delivery_at), "PP p")} · {s.last_delivery_status || '—'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={s.is_active} onCheckedChange={() => toggle(s)} />
                    <Button size="icon" variant="outline" onClick={() => rotate(s)} title="Rotate secret"><KeyRound className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{(editing as Sub)?.id ? "Edit Subscription" : "New Subscription"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing(p => ({ ...p!, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Target URL (https only)</Label>
                <Input value={editing.target_url || ""} onChange={(e) => setEditing(p => ({ ...p!, target_url: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Event types (comma-separated)</Label>
                <Input value={(editing.event_types || []).join(",")}
                       onChange={(e) => setEditing(p => ({ ...p!, event_types: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                       placeholder="order.created, order.shipped" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Max retries</Label>
                  <Input type="number" min={0} max={20} value={editing.max_retries || 5}
                         onChange={(e) => setEditing(p => ({ ...p!, max_retries: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Timeout (ms)</Label>
                  <Input type="number" min={1000} max={60000} value={editing.timeout_ms || 10000}
                         onChange={(e) => setEditing(p => ({ ...p!, timeout_ms: Number(e.target.value) }))} />
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

      <Dialog open={!!revealedSecret} onOpenChange={(o) => !o && setRevealedSecret(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New signing secret</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Copy now — this is the only time it will be shown.</p>
          <pre className="bg-muted p-3 rounded font-mono text-xs break-all">{revealedSecret}</pre>
          <DialogFooter>
            <Button onClick={() => { navigator.clipboard.writeText(revealedSecret!); toast({ title: "Copied" }); }}>Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OutboundWebhookSubscriptions;
