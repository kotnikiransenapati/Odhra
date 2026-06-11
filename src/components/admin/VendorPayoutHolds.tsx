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
import { ShieldAlert, RefreshCw, Plus, Unlock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUS = ['active', 'released', 'all'] as const;

interface Row {
  id: string; vendor_id: string; vendor_business_name: string | null;
  reason: string; severity: string; is_active: boolean;
  placed_by: string; released_by: string | null; released_at: string | null;
  release_note: string | null; created_at: string;
}

export function VendorPayoutHolds() {
  const [status, setStatus] = useState<typeof STATUS[number]>('active');
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vendorId: '', reason: '', severity: 'medium' as typeof SEVERITIES[number] });

  const load = async () => {
    setLoading(true);
    const [l, s] = await Promise.all([
      supabase.rpc('admin_payout_holds_list' as any, { _status: status, _limit: 200 }),
      supabase.rpc('admin_payout_holds_stats' as any),
    ]);
    if (l.error) toast.error(l.error.message); else setRows((l.data as Row[]) || []);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const place = async () => {
    if (!form.vendorId.trim() || form.reason.trim().length < 3) {
      toast.error('Vendor ID and reason (≥3 chars) required');
      return;
    }
    const { error } = await supabase.rpc('admin_payout_hold_place' as any, {
      _vendor_id: form.vendorId.trim(), _reason: form.reason.trim(), _severity: form.severity,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Payout hold placed');
    setOpen(false);
    setForm({ vendorId: '', reason: '', severity: 'medium' });
    load();
  };

  const release = async (id: string) => {
    const note = prompt('Release note (optional):') ?? '';
    const { error } = await supabase.rpc('admin_payout_hold_release' as any, { _id: id, _note: note || null });
    if (error) { toast.error(error.message); return; }
    toast.success('Hold released');
    load();
  };

  const sevVariant = (s: string): any =>
    s === 'critical' ? 'destructive' : s === 'high' ? 'destructive' : s === 'medium' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="w-6 h-6" /> Vendor Payout Holds</h2>
          <p className="text-sm text-muted-foreground">Block vendor payouts pending investigation or compliance review</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Place Hold</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Place Payout Hold</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Vendor ID (UUID)</Label><Input value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })} placeholder="00000000-0000-…" /></div>
                <div><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. KYC document mismatch under review" rows={3} maxLength={1000} /></div>
                <div>
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={(v: any) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={place} className="w-full">Place Hold</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Active Holds', v: stats.active_total ?? 0 },
          { l: 'Critical', v: stats.critical ?? 0, color: 'text-destructive' },
          { l: 'High', v: stats.high ?? 0, color: 'text-destructive' },
          { l: 'Vendors Held', v: stats.vendors_held ?? 0 },
          { l: 'Released (7d)', v: stats.released_7d ?? 0 },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className={`text-2xl font-bold mt-1 ${(k as any).color && Number(k.v) > 0 ? (k as any).color : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Holds</CardTitle>
          <Select value={status} onValueChange={(v: any) => setStatus(v)}>
            <SelectTrigger className="w-40 mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No holds in this view.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Vendor</TableHead><TableHead>Reason</TableHead>
                  <TableHead>Severity</TableHead><TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">
                        {r.vendor_business_name || r.vendor_id.slice(0, 8)}
                        <div className="text-xs text-muted-foreground">{r.vendor_id.slice(0, 8)}…</div>
                      </TableCell>
                      <TableCell className="text-sm max-w-md truncate" title={r.reason}>{r.reason}</TableCell>
                      <TableCell><Badge variant={sevVariant(r.severity)}>{r.severity}</Badge></TableCell>
                      <TableCell>
                        {r.is_active ? <Badge variant="destructive">Active</Badge> : <Badge variant="outline">Released</Badge>}
                        {r.release_note && <div className="text-[10px] text-muted-foreground mt-1 max-w-[12rem] truncate" title={r.release_note}>{r.release_note}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                      <TableCell className="text-right">
                        {r.is_active && (
                          <Button size="sm" variant="outline" onClick={() => release(r.id)}>
                            <Unlock className="w-3 h-3 mr-1" />Release
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
