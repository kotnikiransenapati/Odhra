import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Trash2, Loader2, Ban, Copy } from "lucide-react";
import { format } from "date-fns";

type Item = {
  id: string; name: string; key_prefix: string; scopes: string[];
  description: string | null; expires_at: string | null;
  last_used_at: string | null; use_count: number;
  revoked_at: string | null; created_at: string;
};

export function ApiKeysManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", scopes: "", description: "", expires_at: "" });
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("api_keys")
      .select("id,name,key_prefix,scopes,description,expires_at,last_used_at,use_count,revoked_at,created_at")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setItems((data as Item[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    setCreating(true);
    const { data, error } = await supabase.rpc("admin_create_api_key" as any, {
      _name: form.name.trim(),
      _scopes: form.scopes.split(",").map(s => s.trim()).filter(Boolean),
      _description: form.description.trim() || null,
      _expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    });
    setCreating(false);
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    setIssuedToken((data as any)?.token || null);
    setOpen(false);
    setForm({ name: "", scopes: "", description: "", expires_at: "" });
    load();
  };

  const revoke = async (i: Item) => {
    if (!confirm(`Revoke "${i.name}"? Calls will be rejected immediately.`)) return;
    const { error } = await supabase.rpc("admin_revoke_api_key" as any, { _id: i.id });
    if (error) return toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    toast({ title: "Revoked" }); load();
  };

  const remove = async (i: Item) => {
    if (!confirm(`Delete "${i.name}" permanently?`)) return;
    const { error } = await supabase.rpc("admin_delete_api_key" as any, { _id: i.id });
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6" /> API Keys</h1>
          <p className="text-muted-foreground">Server-to-server tokens with scoped access and rotation.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Key</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Keys</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No API keys.</p>
          ) : (
            <div className="space-y-2">
              {items.map(i => {
                const expired = i.expires_at && new Date(i.expires_at) < new Date();
                return (
                  <div key={i.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{i.name}</span>
                        <code className="text-xs text-muted-foreground">{i.key_prefix}…</code>
                        {i.revoked_at && <Badge variant="destructive">Revoked</Badge>}
                        {!i.revoked_at && expired && <Badge variant="destructive">Expired</Badge>}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {(i.scopes || []).map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {i.use_count} uses
                        {i.last_used_at && ` · last ${format(new Date(i.last_used_at), "PP p")}`}
                        {i.expires_at && ` · expires ${format(new Date(i.expires_at), "PP")}`}
                      </p>
                      {i.description && <p className="text-xs text-muted-foreground mt-1">{i.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {!i.revoked_at && (
                        <Button size="icon" variant="outline" onClick={() => revoke(i)} title="Revoke">
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <Button size="icon" variant="outline" onClick={() => remove(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Integration X" />
            </div>
            <div className="space-y-1.5">
              <Label>Scopes (comma-separated)</Label>
              <Input value={form.scopes} onChange={(e) => setForm(f => ({ ...f, scopes: e.target.value }))} placeholder="orders.read, products.write" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Expires at (optional)</Label>
              <Input type="datetime-local" value={form.expires_at}
                     onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!issuedToken} onOpenChange={(o) => !o && setIssuedToken(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>API key created</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy this token now — it will <strong>never</strong> be shown again.
          </p>
          <pre className="bg-muted p-3 rounded font-mono text-xs break-all">{issuedToken}</pre>
          <DialogFooter>
            <Button onClick={() => { navigator.clipboard.writeText(issuedToken!); toast({ title: "Copied" }); }}>
              <Copy className="h-4 w-4 mr-2" /> Copy token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ApiKeysManager;
