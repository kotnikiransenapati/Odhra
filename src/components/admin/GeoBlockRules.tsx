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
import { Globe, Plus, RefreshCw, Trash2, Pencil } from "lucide-react";

type Rule = {
  id: string; scope: string; country_code: string; mode: "allow" | "deny";
  reason: string | null; active: boolean; created_at: string;
};

const blank = (): Partial<Rule> => ({ scope: "checkout", country_code: "", mode: "deny", reason: "", active: true });
const SCOPES = ["signup", "checkout", "admin", "api"];

export function GeoBlockRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_geo_rules_list" as any);
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRules((data as Rule[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.scope || !editing.country_code?.trim()) {
      return toast({ title: "Scope & country required", variant: "destructive" });
    }
    const { error } = await supabase.rpc("admin_upsert_geo_rule" as any, {
      _id: editing.id || null,
      _scope: editing.scope,
      _country: editing.country_code.trim().toUpperCase(),
      _mode: editing.mode || "deny",
      _reason: editing.reason || null,
      _active: editing.active ?? true,
    });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing.id ? "Rule updated" : "Rule added" });
    setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this geo rule?")) return;
    const { error } = await supabase.rpc("admin_delete_geo_rule" as any, { _id: id });
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Rule deleted" }); load();
  };

  const byScope = rules.reduce<Record<string, Rule[]>>((acc, r) => {
    (acc[r.scope] ||= []).push(r); return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6" /> Geo-Block Rules</h1>
          <p className="text-muted-foreground">Country-level allow/deny lists per scope. Allow rules switch a scope into allow-list mode.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setEditing(blank())}><Plus className="h-4 w-4 mr-1" /> Add rule</Button>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : rules.length === 0
          ? <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              No geo rules. All countries allowed across every scope.
            </CardContent></Card>
          : <div className="space-y-4">
              {Object.entries(byScope).map(([scope, items]) => {
                const hasAllow = items.some(i => i.mode === "allow" && i.active);
                return (
                  <Card key={scope}>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2 capitalize">
                      {scope}
                      <Badge variant={hasAllow ? "default" : "outline"}>{hasAllow ? "Allow-list mode" : "Deny-list mode"}</Badge>
                    </CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {items.map(r => (
                          <div key={r.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/40 text-sm">
                            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                              <Badge variant={r.mode === "allow" ? "default" : "destructive"}>{r.mode.toUpperCase()}</Badge>
                              <code className="text-xs font-bold">{r.country_code}</code>
                              {!r.active && <Badge variant="outline">Inactive</Badge>}
                              {r.reason && <span className="text-xs text-muted-foreground truncate">{r.reason}</span>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit rule" : "Add geo rule"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Scope</Label>
                <select className="bg-background border rounded-md px-3 h-9 w-full text-sm"
                  value={editing.scope} onChange={(e) => setEditing({ ...editing, scope: e.target.value })}>
                  {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Country code (ISO-3166 alpha-2)</Label>
                <Input value={editing.country_code || ""} maxLength={2}
                  onChange={(e) => setEditing({ ...editing, country_code: e.target.value.toUpperCase() })}
                  placeholder="IN, US, PK…" />
              </div>
              <div className="space-y-1.5">
                <Label>Mode</Label>
                <select className="bg-background border rounded-md px-3 h-9 w-full text-sm"
                  value={editing.mode} onChange={(e) => setEditing({ ...editing, mode: e.target.value as "allow" | "deny" })}>
                  <option value="deny">Deny</option>
                  <option value="allow">Allow</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Input value={editing.reason || ""} onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
                  placeholder="e.g. Sanctions list, fraud risk" />
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

export default GeoBlockRules;
