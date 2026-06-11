import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileCheck2, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Stats = {
  total: number; granted: number; revoked: number;
  by_type: { consent_type: string; total: number; granted_count: number; revoked_count: number }[];
  by_source: { source: string; total: number }[];
  window_days: number;
};
type Row = { id: string; user_id: string | null; email: string | null; visitor_hash: string | null;
  consent_type: string; version: string; granted: boolean; source: string; created_at: string; };

export function ConsentLedgerCenter() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [feed, setFeed] = useState<Row[]>([]);
  const [days, setDays] = useState(30);
  const [filterType, setFilterType] = useState("");
  const [onlyRevoked, setOnlyRevoked] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, f] = await Promise.all([
      supabase.rpc("admin_consent_stats" as any, { _days: days }),
      supabase.rpc("admin_consent_feed" as any, { _limit: 150, _type: filterType || null, _only_revoked: onlyRevoked }),
    ]);
    if (s.error) toast({ title: "Stats failed", description: s.error.message, variant: "destructive" });
    setStats((s.data as Stats) || null);
    setFeed((f.data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days, filterType, onlyRevoked]);

  const grantRate = stats && stats.total > 0 ? Math.round((stats.granted / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileCheck2 className="h-6 w-6" /> Consent Ledger</h1>
          <p className="text-muted-foreground">GDPR/CCPA consent audit trail by type, source, and version.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-background border rounded-md px-3 text-sm h-9"
            value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7d</option>
            <option value={30}>Last 30d</option>
            <option value={90}>Last 90d</option>
          </select>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Events", v: stats?.total ?? "—" },
          { l: "Granted", v: stats?.granted ?? "—" },
          { l: "Revoked", v: stats?.revoked ?? "—" },
          { l: "Grant rate", v: `${grantRate}%` },
        ].map(t => (
          <Card key={t.l}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.l}</p>
            <p className="text-2xl font-bold mt-1">{loading ? "…" : t.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">By type</CardTitle></CardHeader>
          <CardContent>
            {(stats?.by_type || []).length === 0 ? <p className="text-sm text-muted-foreground py-2">No data.</p>
              : <div className="space-y-1">
                  {stats!.by_type.map(t => (
                    <button key={t.consent_type}
                      onClick={() => setFilterType(filterType === t.consent_type ? "" : t.consent_type)}
                      className={`w-full flex items-center justify-between p-2 rounded text-sm hover:bg-muted/40 ${filterType === t.consent_type ? "bg-muted" : ""}`}>
                      <code className="text-xs">{t.consent_type}</code>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline">{t.total}</Badge>
                        <Badge variant="secondary">{t.granted_count} ok</Badge>
                        {t.revoked_count > 0 && <Badge variant="destructive">{t.revoked_count} revoked</Badge>}
                      </div>
                    </button>
                  ))}
                </div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By source</CardTitle></CardHeader>
          <CardContent>
            {(stats?.by_source || []).length === 0 ? <p className="text-sm text-muted-foreground py-2">No data.</p>
              : <div className="space-y-1">
                  {stats!.by_source.map(s => (
                    <div key={s.source} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/40">
                      <span>{s.source}</span>
                      <Badge variant="outline">{s.total}</Badge>
                    </div>
                  ))}
                </div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Audit feed {filterType && <Badge variant="secondary" className="ml-2">{filterType}</Badge>}</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="filter by type…" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-8 w-40 text-xs" />
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={onlyRevoked} onChange={(e) => setOnlyRevoked(e.target.checked)} /> Only revoked
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" />Loading…</div>
            : feed.length === 0 ? <p className="text-sm text-muted-foreground py-4">No events.</p>
            : <div className="space-y-1 max-h-[480px] overflow-y-auto">
                {feed.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/40 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={r.granted ? "default" : "destructive"}>{r.granted ? "GRANT" : "REVOKE"}</Badge>
                        <code className="text-xs">{r.consent_type}</code>
                        <Badge variant="outline" className="text-xs">v{r.version}</Badge>
                        <span className="text-xs text-muted-foreground">{r.source}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {r.email || (r.visitor_hash ? `anon:${r.visitor_hash.slice(0,10)}…` : "—")}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                  </div>
                ))}
              </div>}
        </CardContent>
      </Card>
    </div>
  );
}

export default ConsentLedgerCenter;
