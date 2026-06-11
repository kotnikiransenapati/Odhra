import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, RefreshCw, Loader2, Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Stats = {
  total: number; active: number; revoked: number; expired: number;
  new_in_window: number; unique_users: number; window_days: number;
};
type Row = {
  id: string; user_id: string; email: string | null; label: string | null;
  user_agent: string | null; last_seen_at: string; expires_at: string | null;
  revoked_at: string | null; created_at: string;
};

export function TrustedDevicesRegistry() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState(30);
  const [onlyActive, setOnlyActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc("admin_trusted_devices_stats" as any, { _days: days }),
      supabase.rpc("admin_trusted_devices_list" as any, { _limit: 150, _only_active: onlyActive }),
    ]);
    if (s.error) toast({ title: "Stats failed", description: s.error.message, variant: "destructive" });
    setStats((s.data as Stats) || null);
    setRows((l.data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days, onlyActive]);

  const revoke = async (id: string) => {
    if (!confirm("Revoke this trusted device? The user will need to re-verify on next sign-in.")) return;
    const { error } = await supabase.rpc("admin_revoke_trusted_device" as any, { _id: id });
    if (error) return toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    toast({ title: "Device revoked" }); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Trusted Devices</h1>
          <p className="text-muted-foreground">Per-user device fingerprints used to skip step-up auth on known browsers.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-background border rounded-md px-3 text-sm h-9"
            value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7d</option>
            <option value={30}>Last 30d</option>
            <option value={90}>Last 90d</option>
          </select>
          <label className="text-xs flex items-center gap-1 px-2">
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> Only active
          </label>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { l: "Total", v: stats?.total ?? "—" },
          { l: "Active", v: stats?.active ?? "—" },
          { l: "Revoked", v: stats?.revoked ?? "—" },
          { l: "Expired", v: stats?.expired ?? "—" },
          { l: `New (${days}d)`, v: stats?.new_in_window ?? "—" },
        ].map(t => (
          <Card key={t.l}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.l}</p>
            <p className="text-2xl font-bold mt-1">{loading ? "…" : t.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Devices</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" />Loading…</div>
            : rows.length === 0 ? <p className="text-sm text-muted-foreground py-4">No devices.</p>
            : <div className="space-y-1 max-h-[560px] overflow-y-auto">
                {rows.map(r => {
                  const expired = r.expires_at && new Date(r.expires_at) < new Date();
                  const isRevoked = !!r.revoked_at;
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/40 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={isRevoked ? "destructive" : expired ? "outline" : "default"}>
                            {isRevoked ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE"}
                          </Badge>
                          {r.label && <span className="text-xs font-medium">{r.label}</span>}
                          <span className="text-xs text-muted-foreground truncate">{r.email || r.user_id.slice(0, 8)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.user_agent || "—"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(r.last_seen_at), { addSuffix: true })}
                      </span>
                      {!isRevoked && (
                        <Button size="icon" variant="ghost" onClick={() => revoke(r.id)} title="Revoke">
                          <Ban className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>}
        </CardContent>
      </Card>
    </div>
  );
}

export default TrustedDevicesRegistry;
