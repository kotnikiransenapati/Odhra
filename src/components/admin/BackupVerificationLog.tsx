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
import { Database, CheckCircle2, XCircle, Clock, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Verification {
  id: string; snapshot_id: string | null; snapshot_label: string | null;
  status: string; verified_rows: number | null; duration_ms: number | null;
  error_message: string | null; notes: string | null; created_at: string;
  completed_at: string | null;
}

const STATUSES = ['pending', 'running', 'passed', 'failed'];

export function BackupVerificationLog() {
  const [stats, setStats] = useState<any>({});
  const [rows, setRows] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    snapshot_label: '', status: 'passed', verified_rows: '',
    duration_ms: '', error_message: '', notes: '',
  });

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_backup_verifications_stats' as any),
      supabase.rpc('admin_backup_verifications_list' as any, { _limit: 100 }),
    ]);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    if (l.error) toast.error(l.error.message); else setRows((l.data as Verification[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const record = async () => {
    if (!form.snapshot_label.trim()) { toast.error('Snapshot label required'); return; }
    const { error } = await supabase.rpc('admin_record_backup_verification' as any, {
      _snapshot_id: null,
      _snapshot_label: form.snapshot_label.trim(),
      _status: form.status,
      _verified_rows: form.verified_rows ? parseInt(form.verified_rows) : null,
      _duration_ms: form.duration_ms ? parseInt(form.duration_ms) : null,
      _error_message: form.error_message || null,
      _notes: form.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Verification recorded');
    setOpen(false);
    setForm({ snapshot_label: '', status: 'passed', verified_rows: '', duration_ms: '', error_message: '', notes: '' });
    load();
  };

  const statusBadge = (s: string) =>
    s === 'passed' ? 'default' : s === 'failed' ? 'destructive' :
    s === 'running' ? 'secondary' : 'outline';
  const statusIcon = (s: string) =>
    s === 'passed' ? CheckCircle2 : s === 'failed' ? XCircle : Clock;

  const lastPassed = stats.last_passed_at ? formatDistanceToNow(new Date(stats.last_passed_at), { addSuffix: true }) : 'Never';
  const stale = stats.last_passed_at && (Date.now() - new Date(stats.last_passed_at).getTime()) > 7 * 86400000;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Database className="w-6 h-6" /> Backup Verification Log</h2>
          <p className="text-sm text-muted-foreground">Periodic restore-test results that prove backups are usable</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Record Verification</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Backup Verification</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Snapshot Label</Label><Input value={form.snapshot_label} onChange={e => setForm({ ...form, snapshot_label: e.target.value })} placeholder="nightly-2026-06-11" /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Verified Rows</Label><Input type="number" value={form.verified_rows} onChange={e => setForm({ ...form, verified_rows: e.target.value })} /></div>
                <div><Label>Duration (ms)</Label><Input type="number" value={form.duration_ms} onChange={e => setForm({ ...form, duration_ms: e.target.value })} /></div>
              </div>
              {form.status === 'failed' && (
                <div><Label>Error</Label><Textarea value={form.error_message} onChange={e => setForm({ ...form, error_message: e.target.value })} /></div>
              )}
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={record} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {stale && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <XCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Backups Not Verified Recently</p>
            <p className="text-sm text-muted-foreground">Last passed verification was {lastPassed}. Run a restore test soon.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total', v: stats.total ?? 0 },
          { l: 'Pending', v: stats.pending ?? 0 },
          { l: 'Passed (7d)', v: stats.passed_7d ?? 0 },
          { l: 'Failed (7d)', v: stats.failed_7d ?? 0, danger: true },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className={`text-2xl font-bold mt-1 ${k.danger && Number(k.v) > 0 ? 'text-destructive' : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Verification History</span>
            <span className="text-xs font-normal text-muted-foreground">Last passed: {lastPassed}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No verifications yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Snapshot</TableHead><TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead><TableHead>Duration</TableHead>
                  <TableHead>Recorded</TableHead><TableHead>Notes</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => {
                    const Icon = statusIcon(r.status);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.snapshot_label || r.snapshot_id?.slice(0, 8) || '—'}</TableCell>
                        <TableCell><Badge variant={statusBadge(r.status) as any} className="gap-1"><Icon className="w-3 h-3" />{r.status}</Badge></TableCell>
                        <TableCell>{r.verified_rows ?? '—'}</TableCell>
                        <TableCell>{r.duration_ms ? `${r.duration_ms}ms` : '—'}</TableCell>
                        <TableCell className="text-xs">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{r.error_message || r.notes || '—'}</TableCell>
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
