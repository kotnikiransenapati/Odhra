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
import { Download, Plus, X, FileDown, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Job {
  id: string; resource_type: string; format: string; status: string;
  progress: number; row_count: number | null; file_url: string | null;
  error_message: string | null; created_at: string; expires_at: string;
}

const RESOURCES = ['orders', 'customers', 'products', 'reviews', 'subscriptions', 'refunds', 'audit_logs'];
const FORMATS = ['csv', 'json', 'xlsx'];

export function DataExportJobQueue() {
  const [stats, setStats] = useState<any>({});
  const [rows, setRows] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ resource_type: 'orders', format: 'csv', filters: '{}' });

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_export_jobs_stats' as any),
      supabase.rpc('admin_export_jobs_list' as any, { _limit: 100 }),
    ]);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    if (l.error) toast.error(l.error.message); else setRows((l.data as Job[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    let filters: any = {};
    try { filters = form.filters.trim() ? JSON.parse(form.filters) : {}; }
    catch { toast.error('Filters must be valid JSON'); return; }
    const { error } = await supabase.rpc('admin_create_export_job' as any, {
      _resource_type: form.resource_type, _format: form.format, _filters: filters,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Export job queued');
    setOpen(false);
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.rpc('admin_cancel_export_job' as any, { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success('Job cancelled');
    load();
  };

  const statusBadge = (s: string) =>
    s === 'completed' ? 'default' : s === 'failed' ? 'destructive' :
    s === 'running' ? 'secondary' : s === 'cancelled' ? 'outline' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><FileDown className="w-6 h-6" /> Data Export Job Queue</h2>
          <p className="text-sm text-muted-foreground">Queue async exports of platform data with status tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Export</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Export Job</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Resource</Label>
                <Select value={form.resource_type} onValueChange={v => setForm({ ...form, resource_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RESOURCES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Format</Label>
                <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Filters (JSON)</Label>
                <Textarea rows={4} value={form.filters} onChange={e => setForm({ ...form, filters: e.target.value })} placeholder='{"status":"paid"}' />
              </div>
              <Button onClick={create} className="w-full">Queue Job</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Total', v: stats.total ?? 0, i: FileDown },
          { l: 'Queued', v: stats.queued ?? 0, i: Loader2 },
          { l: 'Running', v: stats.running ?? 0, i: Loader2 },
          { l: 'Completed 24h', v: stats.completed_24h ?? 0, i: CheckCircle2 },
          { l: 'Failed 24h', v: stats.failed_24h ?? 0, i: AlertTriangle, danger: true },
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
        <CardHeader><CardTitle className="text-base">Jobs</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No export jobs yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Resource</TableHead><TableHead>Format</TableHead>
                  <TableHead>Status</TableHead><TableHead>Progress</TableHead>
                  <TableHead>Rows</TableHead><TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.resource_type}</TableCell>
                      <TableCell><Badge variant="outline">{r.format.toUpperCase()}</Badge></TableCell>
                      <TableCell><Badge variant={statusBadge(r.status) as any}>{r.status}</Badge></TableCell>
                      <TableCell>{r.progress}%</TableCell>
                      <TableCell>{r.row_count ?? '—'}</TableCell>
                      <TableCell className="text-xs">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {r.file_url && r.status === 'completed' && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={r.file_url} target="_blank" rel="noreferrer"><Download className="w-3 h-3 mr-1" />Download</a>
                          </Button>
                        )}
                        {(r.status === 'queued' || r.status === 'running') && (
                          <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}><X className="w-3 h-3" /></Button>
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
