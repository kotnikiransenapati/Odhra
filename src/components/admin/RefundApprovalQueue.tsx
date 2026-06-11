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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Plus, RefreshCw, Scale } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS = ['pending', 'approved', 'rejected', 'all'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

interface Row {
  id: string; order_id: string; order_number: string | null; refund_id: string | null;
  amount: number; reason: string; priority: string; status: string;
  requested_by: string; reviewer_id: string | null; reviewed_at: string | null;
  decision_note: string | null; created_at: string;
}

export function RefundApprovalQueue() {
  const [status, setStatus] = useState<typeof STATUS[number]>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ orderId: '', amount: '', reason: '', priority: 'normal' as typeof PRIORITIES[number] });

  const load = async () => {
    setLoading(true);
    const [{ data: u }, l, s] = await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc('admin_refund_approval_list' as any, { _status: status, _limit: 200 }),
      supabase.rpc('admin_refund_approval_stats' as any),
    ]);
    setMe(u.user?.id ?? null);
    if (l.error) toast.error(l.error.message); else setRows((l.data as Row[]) || []);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const submit = async () => {
    const amt = parseFloat(form.amount);
    if (!form.orderId.trim() || !(amt > 0) || form.reason.trim().length < 3) {
      toast.error('Order ID, positive amount, and reason ≥3 chars required');
      return;
    }
    const { error } = await supabase.rpc('admin_refund_approval_submit' as any, {
      _order_id: form.orderId.trim(), _amount: amt, _reason: form.reason.trim(), _priority: form.priority,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Approval request submitted');
    setOpen(false); setForm({ orderId: '', amount: '', reason: '', priority: 'normal' });
    load();
  };

  const decide = async (id: string, approve: boolean) => {
    const note = prompt(approve ? 'Approval note (optional):' : 'Rejection reason (required):') ?? '';
    if (!approve && !note.trim()) { toast.error('Rejection reason required'); return; }
    const { error } = await supabase.rpc('admin_refund_approval_decide' as any, { _id: id, _approve: approve, _note: note || null });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? 'Approved' : 'Rejected');
    load();
  };

  const prioVariant = (p: string): any =>
    p === 'urgent' ? 'destructive' : p === 'high' ? 'destructive' : p === 'normal' ? 'secondary' : 'outline';
  const statusVariant = (s: string): any =>
    s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : s === 'pending' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Scale className="w-6 h-6" /> Refund Approval Queue</h2>
          <p className="text-sm text-muted-foreground">Two-admin approval for high-value or sensitive refunds</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Submit Request</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit Refund Approval Request</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Order ID (UUID)</Label><Input value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} /></div>
                <div><Label>Amount (₹)</Label><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} maxLength={1000} /></div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={submit} className="w-full">Submit</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { l: 'Pending', v: stats.pending_total ?? 0 },
          { l: 'Pending ₹', v: `₹${Number(stats.pending_amount ?? 0).toFixed(0)}` },
          { l: 'Urgent', v: stats.urgent ?? 0, color: 'text-destructive' },
          { l: 'My Pending', v: stats.my_pending ?? 0 },
          { l: 'Approved (7d)', v: stats.approved_7d ?? 0 },
          { l: 'Rejected (7d)', v: stats.rejected_7d ?? 0 },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">{k.l}</p>
            <p className={`text-xl font-bold mt-1 ${(k as any).color && Number(k.v) > 0 ? (k as any).color : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requests</CardTitle>
          <Select value={status} onValueChange={(v: any) => setStatus(v)}>
            <SelectTrigger className="w-40 mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No requests in this view.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Order</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead><TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead><TableHead>Age</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => {
                    const isOwn = r.requested_by === me;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.order_number || r.order_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm font-medium">₹{Number(r.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={r.reason}>{r.reason}</TableCell>
                        <TableCell><Badge variant={prioVariant(r.priority)}>{r.priority}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                          {r.decision_note && <div className="text-[10px] text-muted-foreground mt-1 max-w-[10rem] truncate" title={r.decision_note}>{r.decision_note}</div>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {r.status === 'pending' && !isOwn && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => decide(r.id, true)}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => decide(r.id, false)}>
                                <XCircle className="w-3 h-3 mr-1 text-destructive" />Reject
                              </Button>
                            </>
                          )}
                          {r.status === 'pending' && isOwn && <span className="text-[10px] text-muted-foreground">awaiting peer</span>}
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
