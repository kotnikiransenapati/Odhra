import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Siren, RefreshCw, Play, CheckCircle2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const STATUS = ['open', 'unacknowledged', 'resolved', 'all'] as const;

interface Row {
  id: string; order_id: string; order_number: string | null; order_status: string | null;
  order_total: number | null; breach_type: string; severity: string; hours_overdue: number;
  detected_at: string; acknowledged_at: string | null; assigned_to: string | null;
  resolved_at: string | null; resolution_note: string | null;
}

export function OrderSLABreaches() {
  const [status, setStatus] = useState<typeof STATUS[number]>('open');
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [l, s] = await Promise.all([
      supabase.rpc('admin_sla_breaches_list' as any, { _status: status, _limit: 200 }),
      supabase.rpc('admin_sla_breaches_stats' as any),
    ]);
    if (l.error) toast.error(l.error.message); else setRows((l.data as Row[]) || []);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const detect = async () => {
    setDetecting(true);
    const { data, error } = await supabase.rpc('detect_order_sla_breaches' as any);
    setDetecting(false);
    if (error) { toast.error(error.message); return; }
    const d = data as any;
    toast.success(`Detected: ${d?.inserted ?? 0} new, ${d?.updated ?? 0} refreshed`);
    load();
  };

  const ack = async (id: string) => {
    const { error } = await supabase.rpc('admin_sla_breach_acknowledge' as any, { _id: id, _assign_to_me: true });
    if (error) { toast.error(error.message); return; }
    toast.success('Acknowledged & assigned to you');
    load();
  };
  const resolve = async (id: string) => {
    const note = prompt('Resolution note (optional):') ?? '';
    const { error } = await supabase.rpc('admin_sla_breach_resolve' as any, { _id: id, _note: note || null });
    if (error) { toast.error(error.message); return; }
    load();
  };

  const sevVariant = (s: string): any =>
    s === 'critical' || s === 'high' ? 'destructive' : s === 'medium' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Siren className="w-6 h-6" /> Order SLA Breaches</h2>
          <p className="text-sm text-muted-foreground">Orders overdue on fulfillment, shipping, or delivery thresholds</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={detect} disabled={detecting}>
            <Play className="w-4 h-4 mr-2" />{detecting ? 'Scanning…' : 'Detect Now'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { l: 'Open', v: stats.open_total ?? 0 },
          { l: 'Critical', v: stats.critical ?? 0, color: 'text-destructive' },
          { l: 'High', v: stats.high ?? 0, color: 'text-destructive' },
          { l: 'Unacked', v: stats.unacknowledged ?? 0 },
          { l: 'Assigned to me', v: stats.assigned_to_me ?? 0 },
          { l: 'Resolved (24h)', v: stats.resolved_24h ?? 0 },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">{k.l}</p>
            <p className={`text-2xl font-bold mt-1 ${(k as any).color && Number(k.v) > 0 ? (k as any).color : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breaches</CardTitle>
          <Select value={status} onValueChange={(v: any) => setStatus(v)}>
            <SelectTrigger className="w-44 mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No breaches in this view.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Order</TableHead><TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead><TableHead>Overdue</TableHead>
                  <TableHead>State</TableHead><TableHead>Detected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        <Link to={`/admin?tab=orders&order=${r.order_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                          {r.order_number || r.order_id.slice(0, 8)} <Eye className="w-3 h-3" />
                        </Link>
                        {r.order_total != null && <div className="text-muted-foreground">₹{Number(r.order_total).toFixed(2)} · {r.order_status}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.breach_type}</Badge></TableCell>
                      <TableCell><Badge variant={sevVariant(r.severity)}>{r.severity}</Badge></TableCell>
                      <TableCell className="text-sm font-medium">{Number(r.hours_overdue).toFixed(1)}h</TableCell>
                      <TableCell>
                        {r.resolved_at ? <Badge variant="outline">Resolved</Badge> :
                         r.acknowledged_at ? <Badge variant="secondary">Acknowledged</Badge> :
                         <Badge variant="destructive">New</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.detected_at), { addSuffix: true })}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {!r.resolved_at && !r.acknowledged_at && (
                          <Button size="sm" variant="outline" onClick={() => ack(r.id)}>Ack</Button>
                        )}
                        {!r.resolved_at && (
                          <Button size="sm" variant="outline" onClick={() => resolve(r.id)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />Resolve
                          </Button>
                        )}
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
