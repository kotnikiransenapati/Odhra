import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Eye, RefreshCw, RotateCcw, Search, Webhook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { haptic } from '@/lib/haptics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface WebhookEventRow {
  id: string;
  provider: string;
  event_id: string;
  event_type: string | null;
  status: string;
  error: string | null;
  payload: unknown;
  processed_at: string | null;
  created_at: string;
  total_count: number;
}

const PAGE_SIZE = 50;
const STATUSES = ['received', 'processed', 'failed', 'skipped', 'retry_queued'];
const PROVIDERS = ['razorpay', 'delhivery', 'indiapost', 'shiprocket', 'stripe'];

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'processed') return 'default';
  if (status === 'failed') return 'destructive';
  if (status === 'retry_queued') return 'secondary';
  return 'outline';
}

export function WebhookExplorer() {
  const [rows, setRows] = useState<WebhookEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WebhookEventRow | null>(null);
  const [requeueTarget, setRequeueTarget] = useState<WebhookEventRow | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_webhook_events', {
      _provider: provider === 'all' ? null : provider,
      _status: status === 'all' ? null : status,
      _search: search.trim() || null,
      _limit: PAGE_SIZE,
      _offset: page * PAGE_SIZE,
    });
    setLoading(false);
    if (error) {
      toast.error('Failed to load webhooks', { description: error.message });
      return;
    }
    const list = (data ?? []) as WebhookEventRow[];
    setRows(list);
    setTotal(list[0]?.total_count ?? 0);
  }, [page, provider, search, status]);

  useEffect(() => { load(); }, [load]);

  const requeue = async () => {
    if (!requeueTarget) return;
    setBusyId(requeueTarget.id);
    const { error } = await supabase.rpc('admin_webhook_requeue', {
      _id: requeueTarget.id,
      _reason: reason.trim() || null,
    });
    setBusyId(null);
    if (error) {
      toast.error('Replay queue failed', { description: error.message });
      return;
    }
    haptic('medium');
    toast.success('Webhook queued for replay');
    setRequeueTarget(null);
    setReason('');
    load();
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ stiffness: 400, damping: 30 }}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-accent" /> Webhook Explorer
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{total.toLocaleString('en-IN')} recorded deliveries</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={provider} onValueChange={(value) => { setPage(0); setProvider(value); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setPage(0); setStatus(value); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { setPage(0); load(); } }}
                placeholder="Search event"
                className="w-44 pl-8"
              />
            </div>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh webhooks">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No webhook deliveries found.</TableCell></TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium capitalize">{row.provider}</TableCell>
                    <TableCell>
                      <div className="font-mono text-xs break-all">{row.event_id}</div>
                      {row.event_type && <div className="text-xs text-muted-foreground">{row.event_type}</div>}
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={row.error ?? ''}>{row.error ?? '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setSelected(row)} aria-label="Inspect webhook">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" disabled={busyId === row.id} onClick={() => { setReason(''); setRequeueTarget(row); }} aria-label="Queue webhook replay">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground">Page {page + 1} of {pageCount}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{selected?.provider} webhook</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <div><span className="text-muted-foreground">Event:</span> {selected.event_id}</div>
                <div><span className="text-muted-foreground">Type:</span> {selected.event_type ?? '—'}</div>
                <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
                <div><span className="text-muted-foreground">Processed:</span> {selected.processed_at ? new Date(selected.processed_at).toLocaleString() : '—'}</div>
              </div>
              {selected.error && <pre className="bg-destructive/5 text-destructive border border-destructive/20 p-3 rounded text-xs whitespace-pre-wrap">{selected.error}</pre>}
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96">{JSON.stringify(selected.payload, null, 2)}</pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!requeueTarget} onOpenChange={(open) => !open && setRequeueTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Queue webhook replay?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">A replay job will be added to the dead-letter queue for controlled processing.</p>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason or operator note" rows={3} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRequeueTarget(null)}>Cancel</Button>
              <Button onClick={requeue} disabled={!!busyId}>Queue replay</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}