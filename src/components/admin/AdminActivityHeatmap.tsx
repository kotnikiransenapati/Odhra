import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { BarChart3, RefreshCw, Zap } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Cell { hour_of_day: number; day_of_week: number; action_count: number; }

export function AdminActivityHeatmap() {
  const [range, setRange] = useState('7');
  const [stats, setStats] = useState<any>({});
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    const days = parseInt(range);
    const [s, d] = await Promise.all([
      supabase.rpc('admin_activity_heatmap_stats' as any, { _days: days }),
      supabase.rpc('admin_activity_heatmap_data' as any, { _days: days }),
    ]);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    if (d.error) toast.error(d.error.message); else setCells((d.data as Cell[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [range]);

  const refresh = async () => {
    setRefreshing(true);
    const { data, error } = await supabase.rpc('refresh_admin_activity_heatmap' as any, { _days: parseInt(range) });
    setRefreshing(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Rebuilt ${data ?? 0} hourly buckets`);
    load();
  };

  const max = Math.max(1, ...cells.map(c => Number(c.action_count)));
  const getCount = (d: number, h: number) =>
    cells.find(c => c.day_of_week === d && c.hour_of_day === h)?.action_count ?? 0;

  const cellColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    const intensity = Math.min(1, count / max);
    if (intensity < 0.25) return 'bg-primary/20';
    if (intensity < 0.5) return 'bg-primary/40';
    if (intensity < 0.75) return 'bg-primary/70';
    return 'bg-primary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Admin Activity Heatmap</h2>
          <p className="text-sm text-muted-foreground">Hour-of-day × day-of-week distribution of admin actions</p>
        </div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />Rebuild
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total Actions', v: stats.total_actions ?? 0 },
          { l: 'Active Admins', v: stats.active_admins ?? 0 },
          { l: 'Peak Hour', v: stats.peak_hour != null ? `${stats.peak_hour}:00` : '—' },
          { l: 'Peak Count', v: stats.peak_count ?? 0 },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className="text-2xl font-bold mt-1">{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4" /> Activity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex gap-1 mb-1 ml-12">
                  {HOURS.map(h => (
                    <div key={h} className="w-6 text-[10px] text-muted-foreground text-center">{h % 3 === 0 ? h : ''}</div>
                  ))}
                </div>
                {DAYS.map((day, dIdx) => (
                  <div key={day} className="flex gap-1 mb-1 items-center">
                    <div className="w-10 text-xs text-muted-foreground pr-2 text-right">{day}</div>
                    {HOURS.map(h => {
                      const c = getCount(dIdx, h);
                      return (
                        <div
                          key={h}
                          title={`${day} ${h}:00 · ${c} actions`}
                          className={`w-6 h-6 rounded-sm ${cellColor(Number(c))} transition-colors hover:ring-2 hover:ring-primary/50 cursor-pointer`}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded-sm bg-muted" />
                  <div className="w-3 h-3 rounded-sm bg-primary/20" />
                  <div className="w-3 h-3 rounded-sm bg-primary/40" />
                  <div className="w-3 h-3 rounded-sm bg-primary/70" />
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  <span>More</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
