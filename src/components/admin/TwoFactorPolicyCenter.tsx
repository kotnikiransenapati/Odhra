import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Role = "admin" | "vendor" | "customer";
const METHODS = ["totp", "webauthn", "sms", "email"] as const;

type Policy = {
  id: string; target_role: Role; required: boolean; allowed_methods: string[];
  grace_period_days: number; enforce_after: string | null; notes: string | null; updated_at: string;
};
type Enrollment = {
  id: string; user_id: string; email: string | null; method: string;
  label: string | null; verified: boolean; last_used_at: string | null; created_at: string;
};

export function TwoFactorPolicyCenter() {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Policy | null>(null);

  const load = async () => {
    setLoading(true);
    const [p, e] = await Promise.all([
      supabase.rpc("admin_two_factor_policies_list" as any),
      supabase.rpc("admin_two_factor_enrollments" as any, { _limit: 200 }),
    ]);
    if (p.error) toast({ title: "Load failed", description: p.error.message, variant: "destructive" });
    setPolicies((p.data as Policy[]) || []);
    setEnrollments((e.data as Enrollment[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.rpc("admin_upsert_two_factor_policy" as any, {
      _target_role: editing.target_role,
      _required: editing.required,
      _allowed_methods: editing.allowed_methods,
      _grace_period_days: editing.grace_period_days,
      _enforce_after: editing.enforce_after,
      _notes: editing.notes,
    });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Policy saved" });
    setEditing(null); load();
  };

  const reset = async (id: string) => {
    if (!confirm("Reset this 2FA enrollment? The user will need to re-enroll.")) return;
    const { error } = await supabase.rpc("admin_reset_two_factor_enrollment" as any, { _id: id });
    if (error) return toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    toast({ title: "Enrollment reset" }); load();
  };

  const toggleMethod = (m: string) => {
    if (!editing) return;
    const has = editing.allowed_methods.includes(m);
    setEditing({ ...editing, allowed_methods: has ? editing.allowed_methods.filter(x => x !== m) : [...editing.allowed_methods, m] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Two-Factor Auth</h1>
          <p className="text-muted-foreground">Per-role 2FA enforcement, allowed methods, and enrollment registry.</p>
        </div>
        <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Policies ({policies.length})</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({enrollments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          <div className="grid gap-3 md:grid-cols-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : policies.map(p => (
                <Card key={p.id} className="relative">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base capitalize">{p.target_role}</CardTitle>
                    <Badge variant={p.required ? "default" : "outline"}>{p.required ? "Required" : "Optional"}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {p.allowed_methods.map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
                    </div>
                    <p className="text-xs text-muted-foreground">Grace: {p.grace_period_days}d</p>
                    {p.enforce_after && <p className="text-xs text-muted-foreground">Enforce after: {new Date(p.enforce_after).toLocaleString()}</p>}
                    {p.notes && <p className="text-xs">{p.notes}</p>}
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setEditing(p)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="enrollments">
          <Card>
            <CardHeader><CardTitle className="text-base">User enrollments</CardTitle></CardHeader>
            <CardContent>
              {enrollments.length === 0 ? <p className="text-sm text-muted-foreground py-4">No enrollments.</p>
                : <div className="space-y-1 max-h-[520px] overflow-y-auto">
                    {enrollments.map(en => (
                      <div key={en.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/40 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={en.verified ? "default" : "outline"}>{en.method}</Badge>
                            <code className="text-xs truncate">{en.email || en.user_id.slice(0,8)}</code>
                            {en.label && <span className="text-xs text-muted-foreground">{en.label}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Created {formatDistanceToNow(new Date(en.created_at), { addSuffix: true })}
                            {en.last_used_at ? ` · used ${formatDistanceToNow(new Date(en.last_used_at), { addSuffix: true })}` : " · never used"}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => reset(en.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Reset
                        </Button>
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">Edit {editing?.target_role} policy</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Required</Label>
                <Switch checked={editing.required} onCheckedChange={(v) => setEditing({ ...editing, required: v })} />
              </div>
              <div className="space-y-1.5">
                <Label>Allowed methods</Label>
                <div className="flex flex-wrap gap-2">
                  {METHODS.map(m => (
                    <button key={m} type="button"
                      onClick={() => toggleMethod(m)}
                      className={`px-3 py-1 rounded-md border text-xs ${editing.allowed_methods.includes(m) ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Grace period (days)</Label>
                <Input type="number" min={0} value={editing.grace_period_days}
                  onChange={(e) => setEditing({ ...editing, grace_period_days: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Enforce after</Label>
                <Input type="datetime-local"
                  value={editing.enforce_after ? new Date(editing.enforce_after).toISOString().slice(0,16) : ""}
                  onChange={(e) => setEditing({ ...editing, enforce_after: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TwoFactorPolicyCenter;
