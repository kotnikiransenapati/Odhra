import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Webhook, Plus, RefreshCw, Trash2, Pencil } from "lucide-react";

type Rule = {
  id: string; provider: string; label: string | null; cidr: string;
  endpoint_path: string | null; active: boolean; notes: string | null;
  expires_at: string | null; created_at: string;
};

const blank = (): Partial<Rule> => ({ provider: "", label: "", cidr: "", endpoint_path: "", active: true, notes: "", expires_at: null });

export function InboundWebhookAllowlist() {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_inbound_webhook_list" as any);
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRules((data as Rule[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.provider?.trim() || !editing.cidr?.trim()) {
      return toast({ title: "Provider & CIDR required", variant: "destructive" });
    }
    const { error } = await supabase.rpc("admin_upsert_inbound_webhook_rule" as any, {
      _id: editing.id || null,
      _provider: editing.provider.trim(),
      _label: editing.label || null,
      _cidr: editing.cidr.trim(),
      _endpoint_path: editing.endpoint_path || null,
      _active: editing.active ?? true,
      _notes: editing.notes || null,
      _expires_at: editing.expires_at || null,
    });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing.id ? "Rule updated" : "Rule added" });
    setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this rule? Webhooks from this CIDR will no longer be allow-listed.")) return;
    const { error } = await supabase.rpc("admin_delete_inbound_webhook_rule" as any, { _id: id });
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Rule deleted" }); load();
  };

  const byProvider = rules.reduce<Record<string, Rule[]>>((acc, r) => {
    (acc[r.provider] ||= []).push(r); return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="h-6 w-6" /> Inbound Webhook Allowlist</h1>
          <p className="text-muted-foreground">CIDR rules per provider. Empty rules for a provider means allow-all.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setEditing(blank())}><Plus className="h-4 w-4 mr-1" /> Add rule</Button>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : Object.keys(byProvider).length === 0
          ? <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              No allowlist rules. All inbound webhooks are currently accepted (subject to signature/auth).
            </CardContent></Card>
          : <div className="space-y-4">
              {Object.entries(byProvider).map(([provider, items]) => (
                <Card key={provider}>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2">
                    {provider} <Badge variant="outline">{items.filter(i => i.active).length} active</Badge>
                  </CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {items.map(r => {
                        const expired = r.expires_at && new Date(r.expires_at) < new Date();
                        return (
                          <div key={r.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/40 text-sm">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="text-xs">{r.cidr}</code>
                                {r.label && <span className="text-xs text-muted-foreground">{r.label}</span>}
                                {r.endpoint_path && <Badge variant="secondary" className="text-xs">{r.endpoint_path}</Badge>}
                                <Badge variant={r.active && !expired ? "default" : "outline"}>{expired ? "Expired" : r.active ? "Active" : "Inactive"}</Badge>
                              </div>
                              {r.notes && <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit rule" : "Add allowlist rule"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Input value={editing.provider || ""} onChange={(e) => setEditing({ ...editing, provider: e.target.value })}
                  placeholder="razorpay / shiprocket / whatsapp" />
              </div>
              <div className="space-y-1.5">
                <Label>CIDR</Label>
                <Input value={editing.cidr || ""} onChange={(e) => setEditing({ ...editing, cidr: e.target.value })}
                  placeholder="52.66.0.0/16 or 203.0.113.4/32" />
              </div>
              <div className="space-y-1.5">
                <Label>Endpoint path (optional)</Label>
                <Input value={editing.endpoint_path || ""} onChange={(e) => setEditing({ ...editing, endpoint_path: e.target.value })}
                  placeholder="/razorpay-webhook" />
              </div>
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input value={editing.label || ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="e.g. AP-South production" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expires at (optional)</Label>
                <Input type="datetime-local"
                  value={editing.expires_at ? new Date(editing.expires_at).toISOString().slice(0,16) : ""}
                  onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InboundWebhookAllowlist;
