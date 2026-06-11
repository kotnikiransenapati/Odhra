import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Stats = {
  total: number; delivered: number; sent: number; failed: number; queued: number;
  segments: number; cost_cents: number;
  top_templates: { template_key: string; total: number; delivered: number; failed: number }[];
  by_country: { country_code: string; total: number; failed: number }[];
};
type Event = {
  id: string; provider: string; template_key: string | null; country_code: string | null;
  status: string; error_code: string | null; error_message: string | null;
  segment_count: number | null; cost_cents: number | null; occurred_at: string;
};

const STATUS_COLOR: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  delivered: "default", sent: "secondary", queued: "outline",
  failed: "destructive", undelivered: "destructive",
};

export function SmsDeliverabilityMonitor() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [s, e] = await Promise.all([
      supabase.rpc("admin_sms_deliverability_stats" as any, { _hours: hours }),
      supabase.rpc("admin_sms_recent_events" as any, { _limit: 100, _status: statusFilter || null }),
    ]);
    if (s.error) toast({ title: "Stats failed", description: s.error.message, variant: "destructive" });
    setStats((s.data as Stats) || null);
    setEvents((e.data as Event[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hours, statusFilter]);

  const deliveryRate = stats && stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;
  const failureRate = stats && stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6" /> SMS Deliverability</h1>
          <p className="text-muted-foreground">Per-template and per-country SMS lifecycle telemetry.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-background border rounded-md px-3 text-sm h-9"
            value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            <option value={1}>Last 1h</option>
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7d</option>
            <option value={720}>Last 30d</option>
          </select>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { l: "Messages", v: stats?.total ?? "—" },
          { l: "Delivered", v: stats?.delivered ?? "—" },
          { l: "Failed", v: stats?.failed ?? "—" },
          { l: "Delivery rate", v: `${deliveryRate}%` },
          { l: "Segments", v: stats?.segments ?? "—" },
          { l: "Cost", v: stats ? `$${(stats.cost_cents / 100).toFixed(2)}` : "—" },
        ].map(t => (
          <Card key={t.l}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.l}</p>
            <p className="text-2xl font-bold mt-1">{loading ? "…" : t.v}</p>
          </CardContent></Card>
        ))}
      </div>

      {failureRate > 10 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">
            ⚠️ Failure rate {failureRate}% exceeds 10% — investigate provider / templates.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top templates</CardTitle></CardHeader>
          <CardContent>
            {!stats?.top_templates?.length ? <p className="text-sm text-muted-foreground">No data.</p> : (
              <div className="space-y-1.5">
                {stats.top_templates.map(t => {
                  const rate = t.total > 0 ? Math.round((t.delivered / t.total) * 100) : 0;
                  return (
                    <div key={t.template_key} className="flex items-center justify-between gap-2 text-sm">
                      <code className="text-xs truncate">{t.template_key}</code>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">{t.total}</Badge>
                        <Badge variant={rate >= 90 ? "default" : rate >= 70 ? "secondary" : "destructive"}>{rate}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By country</CardTitle></CardHeader>
          <CardContent>
            {!stats?.by_country?.length ? <p className="text-sm text-muted-foreground">No data.</p> : (
              <div className="space-y-1.5">
                {stats.by_country.map(c => {
                  const fr = c.total > 0 ? Math.round((c.failed / c.total) * 100) : 0;
                  return (
                    <div key={c.country_code} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{c.country_code}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{c.total}</Badge>
                        <Badge variant={fr > 10 ? "destructive" : "secondary"}>fail {fr}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent events</CardTitle>
          <select className="bg-background border rounded-md px-2 h-8 text-xs"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {["queued","sent","delivered","failed","undelivered"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" /> Loading…</div>
            : events.length === 0 ? <p className="text-sm text-muted-foreground py-4">No events.</p>
            : (
              <div className="space-y-1 max-h-[480px] overflow-y-auto">
                {events.map(e => (
                  <div key={e.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/40 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_COLOR[e.status] || "outline"}>{e.status}</Badge>
                        {e.template_key && <code className="text-xs">{e.template_key}</code>}
                        {e.country_code && <span className="text-xs text-muted-foreground">{e.country_code}</span>}
                        <span className="text-xs text-muted-foreground">{e.provider}</span>
                      </div>
                      {(e.error_code || e.error_message) && (
                        <p className="text-xs text-destructive truncate mt-0.5">
                          {e.error_code} {e.error_message}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(e.occurred_at), { addSuffix: true })}</span>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SmsDeliverabilityMonitor;
