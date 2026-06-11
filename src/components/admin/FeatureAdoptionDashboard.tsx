import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Row { feature_key: string; total_uses: number; unique_admins: number; last_used: string; }

export function FeatureAdoptionDashboard() {
  const [range, setRange] = useState('30');
  const [stats, setStats] = useState<any>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const days = parseInt(range);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_feature_adoption_stats' as any, { _days: days }),
      supabase.rpc('admin_feature_adoption_leaderboard' as any, { _days: days }),
    ]);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    if (l.error) toast.error(l.error.message); else setRows((l.data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range]);

  const max = Math.max(1, ...rows.map(r => Number(r.total_uses)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6" /> Admin Feature Adoption</h2>
          <p className="text-sm text-muted-foreground">Which admin tools are getting traction — and which are forgotten</p>
        </div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Features Used', v: stats.total_features ?? 0 },
          { l: 'Active Admins', v: stats.active_admins ?? 0 },
          { l: 'Total Events', v: stats.total_events ?? 0 },
          { l: 'Recent Events', v: stats.recent_events ?? 0 },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className="text-2xl font-bold mt-1">{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top Features</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No usage recorded in this period.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Feature</TableHead><TableHead>Uses</TableHead>
                  <TableHead>Admins</TableHead><TableHead>Last Used</TableHead>
                  <TableHead className="w-40">Intensity</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.feature_key}>
                      <TableCell className="font-mono text-xs">{r.feature_key}</TableCell>
                      <TableCell className="font-medium">{r.total_uses}</TableCell>
                      <TableCell>{r.unique_admins}</TableCell>
                      <TableCell className="text-xs">{formatDistanceToNow(new Date(r.last_used), { addSuffix: true })}</TableCell>
                      <TableCell>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-primary h-2" style={{ width: `${Math.max(4, (Number(r.total_uses) / max) * 100)}%` }} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
