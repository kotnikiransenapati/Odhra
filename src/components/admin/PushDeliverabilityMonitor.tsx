import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Stats = {
  total: number; sent: number; delivered: number; failed: number; clicked: number;
  top_templates: { template_key: string; total: number; delivered: number; failed: number; clicked: number }[];
  platforms: { platform: string; total: number; failed: number }[];
  window_hours: number;
};
type Event = {
  id: string; template_key: string | null; platform: string | null; provider: string | null;
  status: string; error_code: string | null; error_message: string | null; occurred_at: string;
};

export function PushDeliverabilityMonitor() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [hours, setHours] = useState(24);
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, e] = await Promise.all([
      supabase.rpc("admin_push_deliverability_stats" as any, { _hours: hours }),
      supabase.rpc("admin_push_recent_events" as any, { _limit: 100, _only_failed: onlyFailed }),
    ]);
    if (s.error) toast({ title: "Stats failed", description: s.error.message, variant: "destructive" });
    setStats((s.data as Stats) || null);
    setEvents((e.data as Event[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hours, onlyFailed]);

  const deliveryRate = stats && stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;
  const clickRate = stats && stats.delivered > 0 ? Math.round((stats.clicked / stats.delivered) * 100) : 0;
  const failureRate = stats && stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0;
  const alert = failureRate >= 10;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Push Deliverability</h1>
          <p className="text-muted-foreground">Web/mobile push lifecycle telemetry across templates and platforms.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-background border rounded-md px-3 text-sm h-9"
            value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            <option value={1}>Last 1h</option>
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7d</option>
          </select>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {alert && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">
            ⚠ Failure rate is {failureRate}% in the last {hours}h — investigate provider or token expiry.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { l: "Total", v: stats?.total ?? "—" },
          { l: "Delivered", v: stats?.delivered ?? "—" },
          { l: "Failed", v: stats?.failed ?? "—" },
          { l: "Clicked", v: stats?.clicked ?? "—" },
          { l: "Delivery rate", v: `${deliveryRate}%` },
          { l: "Click rate", v: `${clickRate}%` },
        ].map((t) => (
          <Card key={t.l}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.l}</p>
            <p className="text-2xl font-bold mt-1">{loading ? "…" : t.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top templates</CardTitle></CardHeader>
          <CardContent>
            {(stats?.top_templates || []).length === 0 ? <p className="text-sm text-muted-foreground py-2">No data.</p> :
              <div className="space-y-1">
                {stats!.top_templates.map((t) => (
                  <div key={t.template_key} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/40">
                    <code className="text-xs">{t.template_key}</code>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline">{t.total} sent</Badge>
                      <Badge variant="secondary">{t.delivered} ok</Badge>
                      {t.failed > 0 && <Badge variant="destructive">{t.failed} fail</Badge>}
                      <Badge>{t.clicked} clk</Badge>
                    </div>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Platforms</CardTitle></CardHeader>
          <CardContent>
            {(stats?.platforms || []).length === 0 ? <p className="text-sm text-muted-foreground py-2">No data.</p> :
              <div className="space-y-1">
                {stats!.platforms.map((p) => {
                  const rate = p.total > 0 ? Math.round((p.failed / p.total) * 100) : 0;
                  return (
                    <div key={p.platform} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/40">
                      <span className="capitalize">{p.platform}</span>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline">{p.total}</Badge>
                        <Badge variant={rate >= 10 ? "destructive" : "secondary"}>{rate}% fail</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent events</CardTitle>
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
            Only failed
          </label>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" />Loading…</div>
            : events.length === 0 ? <p className="text-sm text-muted-foreground py-4">No events.</p>
            : <div className="space-y-1 max-h-[480px] overflow-y-auto">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/40 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={["failed","expired"].includes(ev.status) ? "destructive" : ev.status === "clicked" ? "default" : "secondary"}>{ev.status}</Badge>
                        {ev.template_key && <code className="text-xs">{ev.template_key}</code>}
                        {ev.platform && <span className="text-xs text-muted-foreground">{ev.platform}</span>}
                        {ev.error_code && <Badge variant="outline" className="text-xs">{ev.error_code}</Badge>}
                      </div>
                      {ev.error_message && <p className="text-xs text-muted-foreground truncate mt-0.5">{ev.error_message}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(ev.occurred_at), { addSuffix: true })}</span>
                  </div>
                ))}
              </div>}
        </CardContent>
      </Card>
    </div>
  );
}

export default PushDeliverabilityMonitor;
