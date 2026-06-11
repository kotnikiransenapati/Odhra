import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Heart, CheckCircle2, AlertTriangle, XCircle, Plus, Play, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Probe {
  id: string; name: string; description: string | null; url: string;
  method: string; expected_status: number; timeout_ms: number;
  interval_seconds: number; is_active: boolean;
  last_run_at: string | null; last_status: string | null;
  last_latency_ms: number | null; consecutive_failures: number;
}

export function ServiceHealthProbes() {
  const [stats, setStats] = useState<any>({});
  const [rows, setRows] = useState<Probe[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', url: '', method: 'GET',
    expected_status: 200, timeout_ms: 5000, interval_seconds: 300, is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_probes_stats' as any),
      supabase.rpc('admin_probes_list' as any),
    ]);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    if (l.error) toast.error(l.error.message); else setRows((l.data as Probe[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.url.trim()) { toast.error('Name and URL are required'); return; }
    const { error } = await supabase.rpc('admin_upsert_probe' as any, {
      _name: form.name.trim(), _description: form.description || null, _url: form.url.trim(),
      _method: form.method, _expected_status: form.expected_status,
      _timeout_ms: form.timeout_ms, _interval_seconds: form.interval_seconds, _is_active: form.is_active,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Probe saved');
    setOpen(false);
    setForm({ name: '', description: '', url: '', method: 'GET', expected_status: 200, timeout_ms: 5000, interval_seconds: 300, is_active: true });
    load();
  };

  const runProbe = async (p: Probe) => {
    const start = Date.now();
    let status_code: number | null = null;
    let success = false;
    let error_message: string | null = null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), p.timeout_ms);
      const res = await fetch(p.url, { method: p.method, signal: ctrl.signal, mode: 'no-cors' as any });
      clearTimeout(timer);
      status_code = res.status || null;
      success = res.type === 'opaque' || res.status === p.expected_status;
    } catch (e: any) {
      error_message = e?.message || 'Request failed';
    }
    const latency = Date.now() - start;
    const { error } = await supabase.rpc('admin_record_probe_result' as any, {
      _probe_id: p.id, _status_code: status_code, _latency_ms: latency,
      _success: success, _error_message: error_message,
    });
    if (error) toast.error(error.message);
    else toast.success(success ? `Probe OK (${latency}ms)` : 'Probe failed');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this probe?')) return;
    const { error } = await supabase.rpc('admin_delete_probe' as any, { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success('Probe deleted');
    load();
  };

  const statusVariant = (s: string | null) =>
    s === 'ok' ? 'default' : s === 'degraded' ? 'secondary' : s === 'down' ? 'destructive' : 'outline';
  const StatusIcon = ({ s }: { s: string | null }) =>
    s === 'ok' ? <CheckCircle2 className="w-3 h-3" /> :
    s === 'degraded' ? <AlertTriangle className="w-3 h-3" /> :
    s === 'down' ? <XCircle className="w-3 h-3" /> : <Heart className="w-3 h-3" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6" /> Service Health Probes</h2>
          <p className="text-sm text-muted-foreground">Synthetic monitoring for external dependencies</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Probe</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Service Probe</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="razorpay-status" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://api.example.com/health" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Method</Label>
                  <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['GET','POST','HEAD'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Expected Status</Label><Input type="number" value={form.expected_status} onChange={e => setForm({ ...form, expected_status: parseInt(e.target.value) || 200 })} /></div>
                <div><Label>Timeout (ms)</Label><Input type="number" value={form.timeout_ms} onChange={e => setForm({ ...form, timeout_ms: parseInt(e.target.value) || 5000 })} /></div>
                <div><Label>Interval (s)</Label><Input type="number" value={form.interval_seconds} onChange={e => setForm({ ...form, interval_seconds: parseInt(e.target.value) || 300 })} /></div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Total', v: stats.total ?? 0 },
          { l: 'Active', v: stats.active ?? 0 },
          { l: 'OK', v: stats.ok ?? 0, color: 'text-emerald-600' },
          { l: 'Degraded', v: stats.degraded ?? 0, color: 'text-amber-600' },
          { l: 'Down', v: stats.down ?? 0, color: 'text-destructive' },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className={`text-2xl font-bold mt-1 ${(k as any).color && Number(k.v) > 0 ? (k as any).color : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Probes</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No probes configured.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>URL</TableHead>
                  <TableHead>Status</TableHead><TableHead>Latency</TableHead>
                  <TableHead>Fails</TableHead><TableHead>Last Run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[240px] truncate">{r.url}</TableCell>
                      <TableCell><Badge variant={statusVariant(r.last_status) as any} className="gap-1"><StatusIcon s={r.last_status} />{r.last_status || 'unknown'}</Badge></TableCell>
                      <TableCell>{r.last_latency_ms ? `${r.last_latency_ms}ms` : '—'}</TableCell>
                      <TableCell>{r.consecutive_failures > 0 ? <Badge variant="destructive">{r.consecutive_failures}</Badge> : '0'}</TableCell>
                      <TableCell className="text-xs">{r.last_run_at ? formatDistanceToNow(new Date(r.last_run_at), { addSuffix: true }) : 'Never'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => runProbe(r)}><Play className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3" /></Button>
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
