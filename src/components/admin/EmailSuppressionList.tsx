import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { MailX, Plus, RefreshCw, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const REASONS = ['bounce', 'complaint', 'unsubscribe', 'manual', 'spam_trap'];

interface Row {
  id: string; email: string; reason: string; notes: string | null;
  source: string | null; suppression_count: number; last_event_at: string; is_active: boolean;
}

export function EmailSuppressionList() {
  const [stats, setStats] = useState<any>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', reason: 'manual', notes: '' });

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_suppression_stats' as any),
      supabase.rpc('admin_suppression_list' as any, {
        _search: search || null,
        _reason: reasonFilter === 'all' ? null : reasonFilter,
        _limit: 200,
      }),
    ]);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    if (l.error) toast.error(l.error.message); else setRows((l.data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [reasonFilter]);

  const add = async () => {
    if (!form.email.trim()) { toast.error('Email required'); return; }
    const { error } = await supabase.rpc('admin_add_suppression' as any, {
      _email: form.email.trim(), _reason: form.reason, _notes: form.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Email suppressed');
    setOpen(false);
    setForm({ email: '', reason: 'manual', notes: '' });
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.rpc('admin_toggle_suppression' as any, { _id: id, _active: active });
    if (error) { toast.error(error.message); return; }
    toast.success(active ? 'Re-suppressed' : 'Removed from suppression');
    load();
  };

  const reasonColor = (r: string) =>
    r === 'complaint' || r === 'spam_trap' ? 'destructive' : r === 'bounce' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><MailX className="w-6 h-6" /> Email Suppression List</h2>
          <p className="text-sm text-muted-foreground">Block delivery to addresses that bounced, complained, or unsubscribed</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Suppress Email</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Suppression</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" /></div>
                <div><Label>Reason</Label>
                  <Select value={form.reason} onValueChange={v => setForm({ ...form, reason: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional context" /></div>
                <Button onClick={add} className="w-full">Suppress</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { l: 'Total', v: stats.total ?? 0 },
          { l: 'Active', v: stats.active ?? 0 },
          { l: 'Bounces', v: stats.bounces ?? 0 },
          { l: 'Complaints', v: stats.complaints ?? 0, color: 'text-destructive' },
          { l: 'Unsubscribes', v: stats.unsubscribes ?? 0 },
          { l: 'Last 24h', v: stats.last_24h ?? 0 },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className={`text-2xl font-bold mt-1 ${(k as any).color && Number(k.v) > 0 ? (k as any).color : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suppressed Addresses</CardTitle>
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search email…" className="pl-8" />
            </div>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No suppressed addresses.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Email</TableHead><TableHead>Reason</TableHead>
                  <TableHead>Hits</TableHead><TableHead>Last Event</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.email}</TableCell>
                      <TableCell><Badge variant={reasonColor(r.reason) as any}>{r.reason}</Badge></TableCell>
                      <TableCell>{r.suppression_count}</TableCell>
                      <TableCell className="text-xs">{formatDistanceToNow(new Date(r.last_event_at), { addSuffix: true })}</TableCell>
                      <TableCell>{r.is_active ? <Badge>Blocked</Badge> : <Badge variant="outline">Allowed</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={r.is_active ? 'outline' : 'default'} onClick={() => toggle(r.id, !r.is_active)}>
                          {r.is_active ? 'Unsuppress' : 'Re-block'}
                        </Button>
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
