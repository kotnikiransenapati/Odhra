import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { KeyRound, AlertTriangle, Clock, CheckCircle2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Schedule {
  id: string;
  secret_name: string;
  description: string | null;
  rotation_interval_days: number;
  last_rotated_at: string | null;
  next_due_at: string;
  owner_email: string | null;
  severity: string;
  is_active: boolean;
  notes: string | null;
}

interface Stats {
  total?: number; active?: number; overdue?: number; due_soon?: number; critical?: number;
}

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export function SecretRotationScheduler() {
  const [stats, setStats] = useState<Stats>({});
  const [rows, setRows] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    secret_name: '', description: '', rotation_interval_days: 90,
    owner_email: '', severity: 'medium', is_active: true, notes: '',
  });

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_secret_rotation_stats' as any),
      supabase.rpc('admin_secret_rotation_list' as any),
    ]);
    if (s.error) toast.error(s.error.message); else setStats((s.data as Stats) || {});
    if (l.error) toast.error(l.error.message); else setRows((l.data as Schedule[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.secret_name.trim()) { toast.error('Secret name required'); return; }
    const { error } = await supabase.rpc('admin_upsert_secret_rotation' as any, {
      _secret_name: form.secret_name.trim(),
      _description: form.description || null,
      _interval_days: form.rotation_interval_days,
      _owner_email: form.owner_email || null,
      _severity: form.severity,
      _is_active: form.is_active,
      _notes: form.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Schedule saved');
    setDialogOpen(false);
    setForm({ secret_name: '', description: '', rotation_interval_days: 90, owner_email: '', severity: 'medium', is_active: true, notes: '' });
    load();
  };

  const markRotated = async (id: string) => {
    const { error } = await supabase.rpc('admin_mark_secret_rotated' as any, { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success('Marked as rotated');
    load();
  };

  const severityColor = (s: string) =>
    s === 'critical' ? 'destructive' : s === 'high' ? 'destructive' : s === 'medium' ? 'default' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><KeyRound className="w-6 h-6" /> Secret Rotation Scheduler</h2>
          <p className="text-sm text-muted-foreground">Plan and track rotation cadence for sensitive secrets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Schedule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Rotation Schedule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Secret Name</Label><Input value={form.secret_name} onChange={e => setForm({ ...form, secret_name: e.target.value })} placeholder="e.g. RAZORPAY_KEY_SECRET" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Interval (days)</Label><Input type="number" min={1} value={form.rotation_interval_days} onChange={e => setForm({ ...form, rotation_interval_days: parseInt(e.target.value) || 90 })} /></div>
                <div><Label>Severity</Label>
                  <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Owner Email</Label><Input type="email" value={form.owner_email} onChange={e => setForm({ ...form, owner_email: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Total', v: stats.total ?? 0, i: KeyRound },
          { l: 'Active', v: stats.active ?? 0, i: CheckCircle2 },
          { l: 'Overdue', v: stats.overdue ?? 0, i: AlertTriangle, danger: true },
          { l: 'Due Soon', v: stats.due_soon ?? 0, i: Clock },
          { l: 'Critical', v: stats.critical ?? 0, i: AlertTriangle, danger: true },
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
        <CardHeader><CardTitle className="text-base">Schedules</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No schedules yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Secret</TableHead><TableHead>Severity</TableHead>
                  <TableHead>Interval</TableHead><TableHead>Last Rotated</TableHead>
                  <TableHead>Next Due</TableHead><TableHead>Owner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => {
                    const overdue = new Date(r.next_due_at) < new Date();
                    return (
                      <TableRow key={r.id} className={overdue ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-mono text-xs">{r.secret_name}</TableCell>
                        <TableCell><Badge variant={severityColor(r.severity) as any}>{r.severity}</Badge></TableCell>
                        <TableCell>{r.rotation_interval_days}d</TableCell>
                        <TableCell className="text-xs">{r.last_rotated_at ? formatDistanceToNow(new Date(r.last_rotated_at), { addSuffix: true }) : '—'}</TableCell>
                        <TableCell className={`text-xs ${overdue ? 'text-destructive font-semibold' : ''}`}>{formatDistanceToNow(new Date(r.next_due_at), { addSuffix: true })}</TableCell>
                        <TableCell className="text-xs">{r.owner_email || '—'}</TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => markRotated(r.id)}>Mark Rotated</Button></TableCell>
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
