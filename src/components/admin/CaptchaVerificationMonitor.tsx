import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Stats = {
  total: number; success: number; failed: number;
  avg_score: number | null; low_score: number; window_days: number;
  by_action: { action: string; total: number; failed: number; avg_score: number | null }[];
};
type Row = {
  id: string; provider: string; action: string; success: boolean;
  score: number | null; threshold: number | null; hostname: string | null;
  error_codes: string[] | null; created_at: string;
};

export function CaptchaVerificationMonitor() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState(7);
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      supabase.rpc("admin_captcha_stats" as any, { _days: days }),
      supabase.rpc("admin_captcha_recent" as any, { _limit: 150, _only_failed: onlyFailed }),
    ]);
    if (s.error) toast({ title: "Stats failed", description: s.error.message, variant: "destructive" });
    setStats((s.data as Stats) || null);
    setRows((r.data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days, onlyFailed]);

  const failRate = stats && stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0;
  const warn = failRate >= 10;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6" /> CAPTCHA Verifications</h1>
          <p className="text-muted-foreground">reCAPTCHA verification telemetry by action, score, and outcome.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-background border rounded-md px-3 text-sm h-9"
            value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7d</option>
            <option value={30}>Last 30d</option>
          </select>
          <label className="text-xs flex items-center gap-1 px-2">
            <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} /> Only failed
          </label>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { l: "Total", v: stats?.total ?? "—" },
          { l: "Success", v: stats?.success ?? "—" },
          { l: "Failed", v: stats?.failed ?? "—", warn },
          { l: "Avg score", v: stats?.avg_score ?? "—" },
          { l: "Low score", v: stats?.low_score ?? "—" },
        ].map(t => (
          <Card key={t.l}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.l}</p>
            <p className={`text-2xl font-bold mt-1 ${t.warn ? "text-destructive" : ""}`}>{loading ? "…" : String(t.v)}</p>
          </CardContent></Card>
        ))}
      </div>

      {warn && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Failure rate is {failRate}% (≥ 10%). Investigate site key, threshold, or bot traffic spikes.
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Top actions</CardTitle></CardHeader>
        <CardContent>
          {(stats?.by_action || []).length === 0 ? <p className="text-sm text-muted-foreground py-2">No data.</p>
            : <div className="space-y-1">
                {stats!.by_action.map(a => (
                  <div key={a.action} className="flex items-center justify-between p-2 rounded hover:bg-muted/40 text-sm">
                    <code className="text-xs">{a.action}</code>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline">{a.total}</Badge>
                      {a.failed > 0 && <Badge variant="destructive">{a.failed} failed</Badge>}
                      {a.avg_score !== null && <Badge variant="secondary">avg {a.avg_score}</Badge>}
                    </div>
                  </div>
                ))}
              </div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent events</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" />Loading…</div>
            : rows.length === 0 ? <p className="text-sm text-muted-foreground py-4">No events.</p>
            : <div className="space-y-1 max-h-[480px] overflow-y-auto">
                {rows.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/40 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={r.success ? "default" : "destructive"}>{r.success ? "OK" : "FAIL"}</Badge>
                        <code className="text-xs">{r.action}</code>
                        <span className="text-xs text-muted-foreground">{r.provider}</span>
                        {r.score !== null && <Badge variant="outline" className="text-xs">score {r.score}</Badge>}
                      </div>
                      {r.error_codes && r.error_codes.length > 0 && (
                        <p className="text-xs text-destructive mt-0.5 truncate">{r.error_codes.join(", ")}</p>
                      )}
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

export default CaptchaVerificationMonitor;
