import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { PackageOpen, CheckCircle2, XCircle, MessageSquare, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type FilterKey = 'open' | 'approved' | 'rejected' | 'all';

interface ReturnRow {
  id: string;
  return_number: string;
  sub_order_id: string | null;
  status: string;
  return_reason: string | null;
  return_reason_details: string | null;
  refund_amount: number | null;
  refund_method: string | null;
  images: string[] | null;
  vendor_notes: string | null;
  rejected_reason: string | null;
  created_at: string;
}

const statusTone: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  picked_up: 'bg-accent/15 text-accent-foreground border-accent/30',
  received: 'bg-accent/15 text-accent-foreground border-accent/30',
  refunded: 'bg-success/15 text-success border-success/30',
};

/**
 * Vendor returns workflow console.
 *
 * Lists return requests for the active vendor (RLS scoped on `return_requests.vendor_id`)
 * and exposes approve / reject mutations with structured note capture. Approve also
 * stamps `approved_by` / `approved_at`; reject captures `rejected_reason`.
 */
export function VendorReturnsConsole() {
  const { data: vendorId } = useVendorId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterKey>('open');
  const [active, setActive] = useState<ReturnRow | null>(null);
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-returns', vendorId, filter],
    enabled: !!vendorId,
    staleTime: 30_000,
    queryFn: async (): Promise<ReturnRow[]> => {
      let q = supabase
        .from('return_requests')
        .select(
          'id, return_number, sub_order_id, status, return_reason, return_reason_details, refund_amount, refund_method, images, vendor_notes, rejected_reason, created_at',
        )
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'open') q = q.in('status', ['pending', 'picked_up', 'received']);
      else if (filter === 'approved') q = q.in('status', ['approved', 'refunded']);
      else if (filter === 'rejected') q = q.eq('status', 'rejected');

      const { data: rows, error } = await q;
      if (error) throw error;
      return (rows ?? []) as ReturnRow[];
    },
  });

  const counts = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
    };
  }, [data]);

  const decide = useMutation({
    mutationFn: async (payload: { id: string; mode: 'approve' | 'reject'; note: string }) => {
      const patch =
        payload.mode === 'approve'
          ? {
              status: 'approved',
              approved_at: new Date().toISOString(),
              approved_by: user?.id ?? null,
              vendor_notes: payload.note || null,
            }
          : {
              status: 'rejected',
              rejected_reason: payload.note || 'Rejected by vendor',
              vendor_notes: payload.note || null,
            };
      const { error } = await supabase.from('return_requests').update(patch).eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Return updated');
      setActive(null);
      setMode(null);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['vendor-returns', vendorId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update return'),
  });

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-accent" />
            Returns Console
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{counts.pending} pending</Badge>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-success opacity-50" />
            <p className="font-medium">No returns in this view</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data!.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl bg-secondary/30 border border-border/40 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{r.return_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.return_reason ?? 'No reason specified'} ·{' '}
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.refund_amount != null && (
                      <Badge variant="outline">₹{Number(r.refund_amount).toLocaleString()}</Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`capitalize ${statusTone[r.status] ?? ''}`}
                    >
                      {r.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
                {r.return_reason_details && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {r.return_reason_details}
                  </p>
                )}
                {r.images && r.images.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {r.images.length} attachment(s)
                  </div>
                )}
                {r.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActive(r);
                        setMode('reject');
                        setNote('');
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActive(r);
                        setMode('approve');
                        setNote('');
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={!!active && !!mode}
        onOpenChange={(open) => {
          if (!open) {
            setActive(null);
            setMode(null);
            setNote('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {mode === 'approve' ? 'Approve return' : 'Reject return'} · {active?.return_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {mode === 'approve'
                ? 'Add an internal note for warehouse / refund processing (optional).'
                : 'Share the reason for rejection — this is visible to the customer.'}
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === 'approve' ? 'e.g. QC passed, restock A-12' : 'e.g. Out of return window'}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActive(null);
                setMode(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={decide.isPending || (mode === 'reject' && note.trim().length < 3)}
              onClick={() =>
                active && mode && decide.mutate({ id: active.id, mode, note: note.trim() })
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
