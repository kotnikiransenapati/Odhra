import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, Loader2, TrendingDown, TrendingUp, AlertOctagon } from "lucide-react";
import { format } from "date-fns";

type Stats = {
  since: string;
  total: number; sent: number; delivered: number;
  bounced: number; complained: number; failed: number;
  opened: number; clicked: number;
  by_template: { template: string; count: number }[];
  by_domain: { domain: string; count: number; bounce_rate: number }[];
};

type Event = {
  id: string; recipient_hash: string; recipient_domain: string | null;
  template: string | null; subject: string | null; provider: string;
  status: string; bounce_type: string | null; error_message: string | null;
  occurred_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  sent: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  opened: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  clicked: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  bounced: "bg-destructive/15 text-destructive",
  complained: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  failed: "bg-destructive/15 text-destructive",
  queued: "bg-muted text-muted-foreground",
};

function pct(n: number, d: number) {
  if (!d) return "0%";
  return ((n / d) * 100).toFixed(1) + "%";
}

export function EmailDeliverabilityMonitor() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [{ data: s, error: e1 }, { data: ev, error: e2 }] = await Promise.all([
      supabase.rpc("admin_email_deliverability_stats" as any, { _hours: hours }),
      supabase.rpc("admin_email_recent_events" as any, {
        _status: statusFilter === "all" ? null : statusFilter,
        _template: null, _limit: 100,
      }),
    ]);
    if (e1) toast({ title: "Stats failed", description: e1.message, variant: "destructive" });
    if (e2) toast({ title: "Events failed", description: e2.message, variant: "destructive" });
    setStats((s as Stats) || null);
    setEvents((ev as Event[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hours, statusFilter]);

  const deliveryRate = stats ? pct(stats.delivered, stats.sent) : "—";
  const bounceRate = stats ? pct(stats.bounced, stats.sent || stats.total) : "—";
  const openRate = stats ? pct(stats.opened, stats.delivered) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6" /> Email Deliverability</h1>
          <p className="text-muted-foreground">Live delivery, bounce & engagement health.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1h</SelectItem>
              <SelectItem value="24">Last 24h</SelectItem>
              <SelectItem value="168">Last 7d</SelectItem>
              <SelectItem value="720">Last 30d</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total sent</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.sent ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Delivery rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2 text-emerald-600">
              <TrendingUp className="h-5 w-5" /> {deliveryRate}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bounce rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2 text-destructive">
              <TrendingDown className="h-5 w-5" /> {bounceRate}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open rate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{openRate}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top templates</CardTitle></CardHeader>
          <CardContent>
            {stats?.by_template?.length ? (
              <ul className="space-y-1.5">
                {stats.by_template.map((t) => (
                  <li key={t.template} className="flex justify-between text-sm">
                    <span className="font-mono truncate">{t.template}</span>
                    <span className="text-muted-foreground">{t.count}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Domains</CardTitle></CardHeader>
          <CardContent>
            {stats?.by_domain?.length ? (
              <ul className="space-y-1.5">
                {stats.by_domain.map((d) => (
                  <li key={d.domain} className="flex justify-between text-sm items-center">
                    <span className="font-mono truncate">{d.domain}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">{d.count}</span>
                      {d.bounce_rate > 5 && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertOctagon className="h-3 w-3 mr-0.5" />{d.bounce_rate}%
                        </Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent events</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="complained">Complained</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="clicked">Clicked</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No events.</p>
          ) : (
            <div className="space-y-1.5 max-h-[480px] overflow-auto">
              {events.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-2 rounded border bg-card text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={STATUS_COLOR[e.status] || ""}>{e.status}</Badge>
                      <span className="font-mono text-xs truncate">{e.template || "(no template)"}</span>
                      {e.recipient_domain && <span className="text-xs text-muted-foreground">@{e.recipient_domain}</span>}
                    </div>
                    {e.error_message && <p className="text-xs text-destructive mt-0.5 truncate">{e.error_message}</p>}
                    {e.bounce_type && <p className="text-xs text-muted-foreground mt-0.5">bounce: {e.bounce_type}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(e.occurred_at), "MMM d HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EmailDeliverabilityMonitor;
