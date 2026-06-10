import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { RefreshCw, RotateCcw, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DlqRow {
  id: string;
  job_type: string;
  source: string | null;
  status: string;
  attempts: number;
  error_message: string | null;
  payload: any;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  total_count: number;
}

const PAGE = 50;
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  failed: 'bg-red-500/10 text-red-700 border-red-500/30',
  discarded: 'bg-muted text-muted-foreground',
  resolved: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
};

export function DeadLetterQueueViewer() {
  const [rows, setRows] = useState<DlqRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [selected, setSelected] = useState<DlqRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_dlq_list', {
      _status: statusFilter === 'all' ? null : statusFilter,
      _job_type: jobTypeFilter || null,
      _limit: PAGE,
      _offset: page * PAGE,
    });
    setLoading(false);
    if (error) {
      toast.error('Failed to load DLQ', { description: error.message });
      return;
    }
    const list = (data || []) as DlqRow[];
    setRows(list);
    setTotal(list[0]?.total_count ?? 0);
  }, [statusFilter, jobTypeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const replay = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc('admin_dlq_replay', { _id: id });
    setBusyId(null);
    if (error) return toast.error('Replay failed', { description: error.message });
    toast.success('Job re-queued for retry');
    load();
  };

  const discard = async (id: string) => {
    if (!confirm('Discard this job permanently?')) return;
    setBusyId(id);
    const { error } = await supabase.rpc('admin_dlq_discard', { _id: id, _reason: 'manual' });
    setBusyId(null);
    if (error) return toast.error('Discard failed', { description: error.message });
    toast.success('Job discarded');
    load();
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ stiffness: 400, damping: 30 }}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Dead Letter Queue</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{total} {total === 1 ? 'entry' : 'entries'}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => { setPage(0); setStatusFilter(v); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="discarded">Discarded</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Job type filter"
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              onBlur={() => { setPage(0); load(); }}
              className="w-44"
            />
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last Error</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No jobs.</TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.job_type}</div>
                      {r.source && <div className="text-xs text-muted-foreground">{r.source}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[r.status] ?? ''}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{r.attempts}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={r.error_message ?? ''}>
                      {r.error_message ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setSelected(r)} title="Inspect">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busyId === r.id || r.status === 'pending'}
                          onClick={() => replay(r.id)}
                          title="Replay"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busyId === r.id || r.status === 'discarded'}
                          onClick={() => discard(r.id)}
                          title="Discard"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-muted-foreground">Page {page + 1} of {pageCount}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.job_type}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
                <div><span className="text-muted-foreground">Attempts:</span> {selected.attempts}</div>
                <div><span className="text-muted-foreground">Created:</span> {new Date(selected.created_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Last attempt:</span> {selected.last_attempt_at ? new Date(selected.last_attempt_at).toLocaleString() : '—'}</div>
              </div>
              {selected.error_message && (
                <div>
                  <div className="text-xs font-medium mb-1">Error</div>
                  <pre className="bg-destructive/5 text-destructive border border-destructive/20 p-3 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">{selected.error_message}</pre>
                </div>
              )}
              <div>
                <div className="text-xs font-medium mb-1">Payload</div>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-72">{JSON.stringify(selected.payload, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
