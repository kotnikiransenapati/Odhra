import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subHours, startOfHour } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SystemHealthWidget } from './SystemHealthWidget';
import {
  Activity,
  AlertTriangle,
  Bug,
  Info,
  ShieldAlert,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface ErrorRow {
  id: string;
  created_at: string;
  error_level: string;
  message: string;
  function_name: string | null;
  source: string | null;
}

const LEVELS = ['error', 'warning', 'info'] as const;
type Level = (typeof LEVELS)[number];

const levelMeta: Record<Level, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  error: { label: 'Errors', cls: 'text-destructive', icon: ShieldAlert },
  warning: { label: 'Warnings', cls: 'text-warning', icon: AlertTriangle },
  info: { label: 'Info', cls: 'text-accent', icon: Info },
};

export function SystemHealthDashboard() {
  const since = useMemo(() => subHours(new Date(), 24).toISOString(), []);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['system-health-errors-24h'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_logs')
        .select('id, created_at, error_level, message, function_name, source')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as ErrorRow[];
    },
    refetchInterval: 60_000,
  });

  // Aggregate by level
  const counts = useMemo(() => {
    const base: Record<Level, number> = { error: 0, warning: 0, info: 0 };
    logs.forEach((l) => {
      const lvl = (l.error_level?.toLowerCase() as Level) || 'info';
      if (lvl in base) base[lvl] += 1;
    });
    return base;
  }, [logs]);

  // 24-bucket hourly histogram
  const hist = useMemo(() => {
    const buckets: { hour: Date; total: number; error: number }[] = [];
    const start = startOfHour(subHours(new Date(), 23));
    for (let i = 0; i < 24; i++) {
      const h = new Date(start.getTime() + i * 3600_000);
      buckets.push({ hour: h, total: 0, error: 0 });
    }
    logs.forEach((l) => {
      const t = new Date(l.created_at).getTime();
      const idx = Math.floor((t - start.getTime()) / 3600_000);
      if (idx >= 0 && idx < 24) {
        buckets[idx].total += 1;
        if (l.error_level?.toLowerCase() === 'error') buckets[idx].error += 1;
      }
    });
    return buckets;
  }, [logs]);

  const peak = Math.max(1, ...hist.map((b) => b.total));

  // Top noisy functions
  const topFns = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      const key = l.function_name || l.source || 'unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-accent" />
            System Health
          </h2>
          <p className="text-sm text-muted-foreground">
            Live infrastructure status and 24h error telemetry
          </p>
        </div>
      </div>

      {/* Top: live health + counts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SystemHealthWidget />
        </div>

        {LEVELS.map((lvl) => {
          const meta = levelMeta[lvl];
          const Icon = meta.icon;
          return (
            <Card key={lvl} className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${meta.cls}`} />
                  {meta.label} <span className="text-xs text-muted-foreground font-normal">(24h)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${meta.cls}`}>{counts[lvl]}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {counts[lvl] === 0 ? 'No events' : 'logged events'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Histogram */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Error rate — last 24 hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {hist.map((b, i) => {
              const h = Math.max(2, Math.round((b.total / peak) * 100));
              const errH = Math.round((b.error / peak) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col justify-end group relative">
                  <div
                    className="w-full rounded-t bg-accent/30 transition-colors group-hover:bg-accent/60"
                    style={{ height: `${h}%` }}
                  >
                    {errH > 0 && (
                      <div
                        className="w-full bg-destructive rounded-t"
                        style={{ height: `${(b.error / Math.max(1, b.total)) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover border border-border text-xs px-2 py-1 rounded shadow-md whitespace-nowrap z-10">
                    {format(b.hour, 'HH:00')} · {b.total} events
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{format(hist[0].hour, 'HH:00')}</span>
            <span>now</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top sources */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              Noisiest sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topFns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity in 24h</p>
            ) : (
              <div className="space-y-2">
                {topFns.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <span className="text-sm font-mono truncate">{name}</span>
                    <Badge variant="secondary" className="font-mono">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent events */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="w-4 h-4 text-destructive" />
              Recent events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">All quiet — no events</p>
            ) : (
              <ScrollArea className="h-64 pr-2">
                <ul className="space-y-2">
                  {logs.slice(0, 30).map((l) => {
                    const lvl = (l.error_level?.toLowerCase() as Level) || 'info';
                    const meta = levelMeta[lvl] || levelMeta.info;
                    return (
                      <li
                        key={l.id}
                        className="border-l-2 pl-2 py-1 text-xs"
                        style={{ borderColor: 'currentColor' }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`uppercase font-semibold ${meta.cls}`}>{lvl}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(l.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                        <p className="line-clamp-2 mt-0.5 text-foreground">{l.message}</p>
                        {(l.function_name || l.source) && (
                          <p className="text-muted-foreground font-mono mt-0.5">
                            {l.function_name || l.source}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
