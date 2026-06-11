import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, AlertTriangle, Gauge, Zap, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  total_24h?: number; errors_24h?: number; unique_keys_24h?: number;
  avg_latency_ms?: number; p95_latency_ms?: number;
}
interface Recent {
  id: string; api_key_id: string | null; endpoint: string; method: string;
  status_code: number; latency_ms: number | null; ip_address: string | null;
  error_message: string | null; created_at: string;
}
interface Endpoint { endpoint: string; calls: number; errors: number; avg_latency: number; }

export function ApiKeyUsageAnalytics() {
  const [stats, setStats] = useState<Stats>({});
  const [recent, setRecent] = useState<Recent[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, r, e] = await Promise.all([
      supabase.rpc('admin_api_key_usage_stats' as any),
      supabase.rpc('admin_api_key_usage_recent' as any, { _limit: 100 }),
      supabase.rpc('admin_api_key_usage_by_endpoint' as any),
    ]);
    if (s.error) toast.error(s.error.message); else setStats((s.data as Stats) || {});
    if (r.error) toast.error(r.error.message); else setRecent((r.data as Recent[]) || []);
    if (e.error) toast.error(e.error.message); else setEndpoints((e.data as Endpoint[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const errorRate = stats.total_24h ? ((stats.errors_24h || 0) / stats.total_24h) * 100 : 0;
  const highErrorRate = errorRate > 10;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6" /> API Key Usage Analytics</h2>
        <p className="text-sm text-muted-foreground">Real-time API call telemetry over the last 24 hours</p>
      </div>

      {highErrorRate && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Elevated Error Rate</p>
            <p className="text-sm text-muted-foreground">{errorRate.toFixed(1)}% of API calls returned errors in the last 24h. Investigate failing endpoints below.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Calls (24h)', v: stats.total_24h ?? 0, i: Activity },
          { l: 'Errors (24h)', v: stats.errors_24h ?? 0, i: AlertTriangle, danger: true },
          { l: 'Unique Keys', v: stats.unique_keys_24h ?? 0, i: Layers },
          { l: 'Avg Latency', v: `${stats.avg_latency_ms ?? 0}ms`, i: Gauge },
          { l: 'P95 Latency', v: `${stats.p95_latency_ms ?? 0}ms`, i: Zap },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <k.i className={`w-4 h-4 ${k.danger && Number(k.v) > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <p className={`text-2xl font-bold mt-1 ${k.danger && Number(k.v) > 0 ? 'text-destructive' : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top Endpoints (24h)</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           endpoints.length === 0 ? <p className="text-sm text-muted-foreground">No traffic recorded.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Endpoint</TableHead><TableHead>Calls</TableHead>
                <TableHead>Errors</TableHead><TableHead>Avg Latency</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {endpoints.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{e.endpoint}</TableCell>
                    <TableCell>{e.calls}</TableCell>
                    <TableCell>{e.errors > 0 ? <Badge variant="destructive">{e.errors}</Badge> : '0'}</TableCell>
                    <TableCell>{e.avg_latency ?? '—'}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Calls</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? <p className="text-sm text-muted-foreground">No recent events.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead><TableHead>Method</TableHead>
                  <TableHead>Endpoint</TableHead><TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead><TableHead>IP</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {recent.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                      <TableCell><Badge variant="outline">{r.method}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.endpoint}</TableCell>
                      <TableCell><Badge variant={r.status_code >= 400 ? 'destructive' : 'secondary'}>{r.status_code}</Badge></TableCell>
                      <TableCell>{r.latency_ms ?? '—'}ms</TableCell>
                      <TableCell className="text-xs font-mono">{r.ip_address || '—'}</TableCell>
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
