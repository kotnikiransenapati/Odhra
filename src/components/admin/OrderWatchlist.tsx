import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Eye, RefreshCw, Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Link } from 'react-router-dom';

const SEVERITIES = ['low', 'medium', 'high'] as const;
const STATUS_TABS = ['open', 'overdue', 'resolved', 'all'] as const;

interface Row {
  id: string; order_id: string; reason: string; severity: string;
  due_at: string | null; resolved_at: string | null; created_at: string;
  order_number: string | null; order_status: string | null; order_total: number | null;
}

export function OrderWatchlist() {
  const [status, setStatus] = useState<typeof STATUS_TABS[number]>('open');
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ orderId: '', reason: '', severity: 'medium' as typeof SEVERITIES[number], dueAt: '' });

  const load = async () => {
    setLoading(true);
    const [l, s] = await Promise.all([
      supabase.rpc('admin_watchlist_list' as any, { _status: status, _limit: 200 }),
      supabase.rpc('admin_watchlist_stats' as any),
    ]);
    if (l.error) toast.error(l.error.message); else setRows((l.data as Row[]) || []);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const add = async () => {
    if (!form.orderId.trim() || !form.reason.trim()) { toast.error('Order ID and reason required'); return; }
    const { error } = await supabase.rpc('admin_watchlist_add' as any, {
      _order_id: form.orderId.trim(),
      _reason: form.reason.trim(),
      _severity: form.severity,
      _due_at: form.dueAt ? new Date(form.dueAt).toISOString() : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Order pinned to watchlist');
    setOpen(false);
    setForm({ orderId: '', reason: '', severity: 'medium', dueAt: '' });
    load();
  };

  const resolve = async (id: string) => {
    const note = prompt('Resolution note (optional):') ?? '';
    const { error } = await supabase.rpc('admin_watchlist_resolve' as any, { _id: id, _note: note || null });
    if (error) { toast.error(error.message); return; }
    toast.success('Resolved');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remove from watchlist?')) return;
    const { error } = await supabase.rpc('admin_watchlist_remove' as any, { _id: id });
    if (error) { toast.error(error.message); return; }
    load();
  };

  const sevVariant = (s: string): any => s === 'high' ? 'destructive' : s === 'medium' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Eye className="w-6 h-6" /> Order Watchlist</h2>
          <p className="text-sm text-muted-foreground">Pin orders that need your follow-up, with severity & due dates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Pin Order</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pin Order to Watchlist</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Order ID (UUID)</Label><Input value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} placeholder="00000000-0000-…" /></div>
                <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. customer disputed delivery" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Severity</Label>
                    <Select value={form.severity} onValueChange={(v: any) => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Due By (optional)</Label><Input type="datetime-local" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} /></div>
                </div>
                <Button onClick={add} className="w-full">Pin</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Open', v: stats.mine_open ?? 0 },
          { l: 'Overdue', v: stats.mine_overdue ?? 0, color: 'text-destructive' },
          { l: 'High Severity', v: stats.mine_high ?? 0, color: 'text-destructive' },
          { l: 'Resolved (7d)', v: stats.mine_resolved_7d ?? 0 },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className={`text-2xl font-bold mt-1 ${(k as any).color && Number(k.v) > 0 ? (k as any).color : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Watchlist</CardTitle>
          <Select value={status} onValueChange={(v: any) => setStatus(v)}>
            <SelectTrigger className="w-40 mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_TABS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No orders in this view.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Order</TableHead><TableHead>Reason</TableHead>
                  <TableHead>Severity</TableHead><TableHead>Due</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => {
                    const overdue = !r.resolved_at && r.due_at && new Date(r.due_at) < new Date();
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          <Link to={`/admin?tab=orders&order=${r.order_id}`} className="text-primary hover:underline">
                            {r.order_number || r.order_id.slice(0, 8)}
                          </Link>
                          {r.order_total != null && <div className="text-muted-foreground">₹{Number(r.order_total).toFixed(2)}</div>}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={r.reason}>{r.reason}</TableCell>
                        <TableCell><Badge variant={sevVariant(r.severity)}>{r.severity}</Badge></TableCell>
                        <TableCell className="text-xs">
                          {r.due_at ? (
                            <span className={overdue ? 'text-destructive font-medium' : ''}>
                              {format(new Date(r.due_at), 'MMM d, HH:mm')}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {r.resolved_at ? <Badge variant="outline">Resolved</Badge> :
                           overdue ? <Badge variant="destructive">Overdue</Badge> :
                           <Badge>Open</Badge>}
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {!r.resolved_at && (
                            <Button size="sm" variant="outline" onClick={() => resolve(r.id)}>
                              <CheckCircle2 className="w-3 h-3 mr-1" />Resolve
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
