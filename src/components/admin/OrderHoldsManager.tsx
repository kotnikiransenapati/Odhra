import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Hand, Plus, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';

const REASONS = [
  { code: 'fraud_review', label: 'Fraud Review' },
  { code: 'payment_issue', label: 'Payment Issue' },
  { code: 'address_verification', label: 'Address Verification' },
  { code: 'stock_issue', label: 'Stock Issue' },
  { code: 'customer_request', label: 'Customer Request' },
  { code: 'manual_review', label: 'Manual Review' },
  { code: 'compliance_check', label: 'Compliance Check' },
  { code: 'other', label: 'Other' },
];

const SEVERITY_COLOR: Record<string, 'default'|'secondary'|'destructive'|'outline'> = {
  low: 'outline', medium: 'secondary', high: 'default', critical: 'destructive',
};

interface Hold {
  id: string; order_id: string; order_number?: string; order_total?: number;
  reason_code: string; reason_notes: string | null; severity: string; status: string;
  placed_by: string | null; released_by: string | null; released_at: string | null;
  release_notes: string | null; expires_at: string | null; created_at: string;
}
interface Stats { active: number; critical: number; released_24h: number; total_active_value: number; }

export function OrderHoldsManager() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Hold[]>([]);
  const [status, setStatus] = useState<'active'|'released'|'expired'>('active');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ order_id: '', reason_code: 'manual_review', severity: 'medium', notes: '', expires_at: '' });
  const [releaseOpen, setReleaseOpen] = useState<{ id: string } | null>(null);
  const [releaseNotes, setReleaseNotes] = useState('');

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_order_holds_stats' as any),
      supabase.rpc('admin_order_holds_list' as any, { _status: status, _limit: 100, _offset: 0 }),
    ]);
    if (s.error) toast.error(s.error.message); else setStats(s.data as Stats);
    if (l.error) toast.error(l.error.message); else setRows((l.data as Hold[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const place = async () => {
    if (!form.order_id.trim()) { toast.error('Order ID required'); return; }
    const { error } = await supabase.rpc('admin_order_hold_place' as any, {
      _order_id: form.order_id.trim(),
      _reason_code: form.reason_code,
      _severity: form.severity,
      _notes: form.notes || null,
      _expires_at: form.expires_at || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Hold placed');
    setOpen(false);
    setForm({ order_id: '', reason_code: 'manual_review', severity: 'medium', notes: '', expires_at: '' });
    load();
  };

  const release = async () => {
    if (!releaseOpen) return;
    const { error } = await supabase.rpc('admin_order_hold_release' as any, {
      _hold_id: releaseOpen.id, _release_notes: releaseNotes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Hold released');
    setReleaseOpen(null); setReleaseNotes('');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Hand className="w-6 h-6" /> Order Holds</h2>
          <p className="text-sm text-muted-foreground">Pause order fulfillment with categorized reasons</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Place Hold</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Place Order Hold</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Order ID (UUID)</Label><Input value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })} placeholder="00000000-..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Reason</Label>
                    <Select value={form.reason_code} onValueChange={v => setForm({ ...form, reason_code: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{REASONS.map(r => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Severity</Label>
                    <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['low','medium','high','critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
                <div><Label>Expires At (optional)</Label><Input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={place}>Place Hold</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-bold">{stats?.active ?? '—'}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Critical</div><div className="text-2xl font-bold text-destructive">{stats?.critical ?? '—'}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Released (24h)</div><div className="text-2xl font-bold">{stats?.released_24h ?? '—'}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Active Order Value</div><div className="text-2xl font-bold">₹{Number(stats?.total_active_value ?? 0).toLocaleString()}</div></CardContent></Card>
      </div>

      <Tabs value={status} onValueChange={v => setStatus(v as any)}>
        <TabsList><TabsTrigger value="active">Active</TabsTrigger><TabsTrigger value="released">Released</TabsTrigger><TabsTrigger value="expired">Expired</TabsTrigger></TabsList>
      </Tabs>

      <Card>
        <CardHeader><CardTitle className="text-base">{status === 'active' ? 'Active Holds' : status === 'released' ? 'Released' : 'Expired'}</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> :
           rows.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No holds.</div> :
           <div className="space-y-2">
            {rows.map(h => (
              <div key={h.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={SEVERITY_COLOR[h.severity]}><ShieldAlert className="w-3 h-3 mr-1" />{h.severity}</Badge>
                    <span className="font-medium">{REASONS.find(r => r.code === h.reason_code)?.label || h.reason_code}</span>
                    {h.order_number && <Badge variant="outline">#{h.order_number}</Badge>}
                    {h.order_total != null && <span className="text-xs text-muted-foreground">₹{Number(h.order_total).toLocaleString()}</span>}
                  </div>
                  {h.reason_notes && <p className="text-sm text-muted-foreground mt-1 truncate">{h.reason_notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Placed {new Date(h.created_at).toLocaleString()}{h.expires_at && ` · expires ${new Date(h.expires_at).toLocaleString()}`}</p>
                </div>
                {status === 'active' && (
                  <Button size="sm" variant="outline" onClick={() => setReleaseOpen({ id: h.id })}><CheckCircle2 className="w-4 h-4 mr-1" />Release</Button>
                )}
              </div>
            ))}
          </div>}
        </CardContent>
      </Card>

      <Dialog open={!!releaseOpen} onOpenChange={o => !o && setReleaseOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Release Hold</DialogTitle></DialogHeader>
          <div><Label>Release Notes</Label><Textarea value={releaseNotes} onChange={e => setReleaseNotes(e.target.value)} rows={3} placeholder="Reason for release / next steps" /></div>
          <DialogFooter><Button onClick={release}>Confirm Release</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
