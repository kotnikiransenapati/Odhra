import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Loader2, Lock, Unlock, Plus, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Stats = { total: number; successes: number; failures: number; unique_ips: number; unique_emails: number; active_lockouts: number; };
type Attempt = { id: string; email_hash: string | null; ip_hash: string | null; ip_inet: string | null; success: boolean; failure_reason: string | null; user_agent: string | null; attempted_at: string; };
type Lockout = { id: string; identifier_type: string; identifier_label: string | null; attempt_count: number; locked_until: string; reason: string | null; created_at: string; unlocked_at: string | null; };

export function LoginSecurityCenter() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [lockouts, setLockouts] = useState<Lockout[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyFailed, setOnlyFailed] = useState(true);
  const [hours, setHours] = useState(24);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockForm, setLockForm] = useState({ type: "ip", identifier: "", minutes: 30, reason: "" });

  const load = async () => {
    setLoading(true);
    const [s, a, l] = await Promise.all([
      supabase.rpc("admin_login_security_stats" as any, { _hours: hours }),
      supabase.rpc("admin_recent_login_attempts" as any, { _limit: 100, _only_failed: onlyFailed }),
      supabase.rpc("admin_login_lockouts_list" as any),
    ]);
    if (s.error) toast({ title: "Stats failed", description: s.error.message, variant: "destructive" });
    setStats((s.data as Stats) || null);
    setAttempts((a.data as Attempt[]) || []);
    setLockouts((l.data as Lockout[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hours, onlyFailed]);

  const unlock = async (id: string) => {
    const { error } = await supabase.rpc("admin_unlock_identifier" as any, { _id: id });
    if (error) return toast({ title: "Unlock failed", description: error.message, variant: "destructive" });
    toast({ title: "Unlocked" }); load();
  };

  const lock = async () => {
    if (!lockForm.identifier.trim()) return toast({ title: "Identifier required", variant: "destructive" });
    const { error } = await supabase.rpc("admin_lock_identifier" as any, {
      _type: lockForm.type, _identifier: lockForm.identifier.trim(),
      _minutes: lockForm.minutes, _reason: lockForm.reason || "manual lock",
    });
    if (error) return toast({ title: "Lock failed", description: error.message, variant: "destructive" });
    toast({ title: "Locked" });
    setLockOpen(false);
    setLockForm({ type: "ip", identifier: "", minutes: 30, reason: "" });
    load();
  };

  const successRate = stats && stats.total > 0 ? Math.round((stats.successes / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6" /> Login Security</h1>
          <p className="text-muted-foreground">Failed login telemetry, brute-force lockouts, manual blocks.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-background border rounded-md px-3 text-sm h-9"
            value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            <option value={1}>Last 1h</option>
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7d</option>
          </select>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setLockOpen(true)}><Plus className="h-4 w-4 mr-1" /> Lock identifier</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { l: "Attempts", v: stats?.total ?? "—" },
          { l: "Successes", v: stats?.successes ?? "—" },
          { l: "Failures", v: stats?.failures ?? "—" },
          { l: "Success rate", v: `${successRate}%` },
          { l: "Unique IPs", v: stats?.unique_ips ?? "—" },
          { l: "Active lockouts", v: stats?.active_lockouts ?? "—" },
        ].map((t) => (
          <Card key={t.l}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.l}</p>
            <p className="text-2xl font-bold mt-1">{loading ? "…" : t.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="attempts">
        <TabsList><TabsTrigger value="attempts">Attempts</TabsTrigger><TabsTrigger value="lockouts">Lockouts ({lockouts.filter(l => !l.unlocked_at && new Date(l.locked_until) > new Date()).length})</TabsTrigger></TabsList>

        <TabsContent value="attempts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent attempts</CardTitle>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
                Only failed
              </label>
            </CardHeader>
            <CardContent>
              {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" /> Loading…</div>
                : attempts.length === 0 ? <p className="text-sm text-muted-foreground py-4">No attempts.</p>
                : (
                  <div className="space-y-1 max-h-[480px] overflow-y-auto">
                    {attempts.map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/40 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={a.success ? "default" : "destructive"}>{a.success ? "OK" : "FAIL"}</Badge>
                            <code className="text-xs">{a.ip_inet || a.ip_hash?.slice(0, 12) + "…" || "—"}</code>
                            {a.failure_reason && <span className="text-xs text-muted-foreground">{a.failure_reason}</span>}
                          </div>
                          {a.user_agent && <p className="text-xs text-muted-foreground truncate mt-0.5">{a.user_agent}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(a.attempted_at), { addSuffix: true })}</span>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lockouts">
          <Card>
            <CardHeader><CardTitle className="text-base">Lockouts</CardTitle></CardHeader>
            <CardContent>
              {lockouts.length === 0 ? <p className="text-sm text-muted-foreground py-4">No lockouts.</p>
                : (
                  <div className="space-y-2">
                    {lockouts.map(l => {
                      const active = !l.unlocked_at && new Date(l.locked_until) > new Date();
                      return (
                        <div key={l.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={active ? "destructive" : "outline"}>{active ? "Active" : "Cleared"}</Badge>
                              <Badge variant="secondary">{l.identifier_type}</Badge>
                              <code className="text-xs">{l.identifier_label}</code>
                              <span className="text-xs text-muted-foreground">{l.attempt_count} attempts</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {l.reason} · until {new Date(l.locked_until).toLocaleString()}
                            </p>
                          </div>
                          {active && (
                            <Button size="sm" variant="outline" onClick={() => unlock(l.id)}>
                              <Unlock className="h-4 w-4 mr-1" /> Unlock
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={lockOpen} onOpenChange={setLockOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Lock identifier</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select className="w-full bg-background border rounded-md px-3 h-9 text-sm"
                value={lockForm.type} onChange={(e) => setLockForm(f => ({ ...f, type: e.target.value }))}>
                <option value="ip">IP address</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Identifier</Label>
              <Input value={lockForm.identifier} onChange={(e) => setLockForm(f => ({ ...f, identifier: e.target.value }))}
                placeholder={lockForm.type === "ip" ? "203.0.113.4" : "user@example.com"} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" min={1} value={lockForm.minutes}
                onChange={(e) => setLockForm(f => ({ ...f, minutes: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={lockForm.reason} onChange={(e) => setLockForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockOpen(false)}>Cancel</Button>
            <Button onClick={lock}>Lock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LoginSecurityCenter;
