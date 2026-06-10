import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Monitor, RefreshCw, ShieldAlert, LogOut, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  admin_user_id: string;
  ip_address: string | null;
  country: string | null;
  user_agent: string | null;
  is_suspicious: boolean;
  suspicious_reason: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  last_seen_at: string;
  created_at: string;
};

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

export function AdminSessionActivity() {
  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const rpc = supabase as unknown as Rpc;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await rpc.rpc("admin_list_admin_sessions", { _only_active: onlyActive, _limit: 300 });
    if (error) toast.error(error.message);
    setRows((data as Session[]) ?? []);
    setLoading(false);
  }, [onlyActive, rpc]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => rows.reduce((a, r) => {
    a.total++;
    if (!r.revoked_at) a.active++;
    if (r.is_suspicious) a.suspicious++;
    return a;
  }, { total: 0, active: 0, suspicious: 0 }), [rows]);

  const revoke = async (id: string) => {
    const { error } = await rpc.rpc("admin_revoke_admin_session", { _session_id: id });
    if (error) return toast.error(error.message);
    toast.success("Session revoked");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Monitor className="w-6 h-6 text-primary" /> Admin Session Activity</h2>
          <p className="text-sm text-muted-foreground mt-1">Track admin sessions, flag suspicious IP/country changes, and force-logout compromised sessions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2"><Switch id="active-only" checked={onlyActive} onCheckedChange={setOnlyActive} /><Label htmlFor="active-only" className="text-sm">Active only</Label></div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Total</div><div className="text-3xl font-bold mt-1">{counts.total}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Active</div><div className="text-3xl font-bold mt-1">{counts.active}</div></Card>
        <Card className={cn("p-4", counts.suspicious > 0 && "border-destructive")}><div className="text-xs uppercase text-muted-foreground flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Suspicious</div><div className={cn("text-3xl font-bold mt-1", counts.suspicious > 0 && "text-destructive")}>{counts.suspicious}</div></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Sessions</div>
        {loading && rows.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          : rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No sessions recorded.</div>
          : <div className="divide-y max-h-[640px] overflow-auto">
              {rows.map((r, idx) => (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}
                  className={cn("p-4 flex items-start justify-between gap-3 flex-wrap", r.is_suspicious && !r.revoked_at && "bg-destructive/5")}>
                  <div className="min-w-0">
                    <div className="font-medium font-mono text-sm truncate flex items-center gap-2">
                      <Globe className="w-3 h-3 text-muted-foreground" />
                      {r.ip_address ?? "unknown"}{r.country && <span className="text-muted-foreground">· {r.country}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-1 max-w-xl">{r.user_agent ?? "—"}</div>
                    <div className="text-xs text-muted-foreground mt-1">Last seen {formatDistanceToNow(new Date(r.last_seen_at), { addSuffix: true })}</div>
                    {r.suspicious_reason && <div className="text-xs text-destructive mt-1">⚠ {r.suspicious_reason}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.is_suspicious && <Badge variant="destructive">suspicious</Badge>}
                    {r.revoked_at ? <Badge variant="outline">revoked</Badge>
                      : <Button size="sm" variant="outline" onClick={() => revoke(r.id)}><LogOut className="w-4 h-4 mr-1" /> Revoke</Button>}
                  </div>
                </motion.div>
              ))}
            </div>}
      </Card>
    </div>
  );
}
