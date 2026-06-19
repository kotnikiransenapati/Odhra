import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarClock, Package2, X, CheckCircle2, RefreshCw } from 'lucide-react';

type PreOrderRow = {
  id: string;
  user_id: string;
  product_id: string;
  vendor_id: string | null;
  quantity: number;
  unit_price: number;
  deposit_amount: number;
  balance_amount: number;
  expected_release_date: string | null;
  status: string;
  payment_status: string;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  fulfilled_order_id: string | null;
};

const STATUSES = ['reserved', 'confirmed', 'fulfilled', 'cancelled', 'expired'] as const;

const statusColor = (s: string) => {
  switch (s) {
    case 'reserved': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
    case 'confirmed': return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'fulfilled': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'cancelled': return 'bg-red-500/10 text-red-700 dark:text-red-300';
    case 'expired': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function PreOrderManager() {
  const [rows, setRows] = useState<PreOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [fulfillTarget, setFulfillTarget] = useState<PreOrderRow | null>(null);
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_preorders_list', {
        _status: filter === 'all' ? null : filter,
        _limit: 200,
      });
      if (error) throw error;
      setRows((data as PreOrderRow[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load pre-orders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleFulfill = async () => {
    if (!fulfillTarget) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_preorder_fulfill', {
        _preorder_id: fulfillTarget.id,
        _order_id: orderId.trim() || null,
      });
      if (error) throw error;
      toast.success('Pre-order fulfilled');
      setFulfillTarget(null);
      setOrderId('');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to fulfill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (row: PreOrderRow) => {
    const reason = window.prompt('Cancellation reason (optional)');
    if (reason === null) return;
    try {
      const { error } = await supabase.rpc('preorder_cancel', {
        _preorder_id: row.id,
        _reason: reason || null,
      });
      if (error) throw error;
      toast.success('Pre-order cancelled');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to cancel');
    }
  };

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.contact_email || '').toLowerCase().includes(q)
      || (r.contact_phone || '').includes(q)
      || r.product_id.includes(q)
      || r.id.includes(q);
  });

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = rows.filter(r => r.status === s).length;
    return acc;
  }, { all: rows.length });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package2 className="h-6 w-6" /> Pre-Orders
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage reservations for upcoming and out-of-stock products
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search by email, phone, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          {STATUSES.map(s => (
            <TabsTrigger key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No pre-orders found
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map(row => (
                <Card key={row.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-mono truncate">
                          {row.id.slice(0, 8)}…
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge className={statusColor(row.status)}>{row.status}</Badge>
                          <Badge variant="outline">{row.payment_status}</Badge>
                          <Badge variant="secondary">Qty {row.quantity}</Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold">
                          ₹{(row.unit_price * row.quantity).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Deposit ₹{row.deposit_amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Contact: {row.contact_email || row.contact_phone || '—'}</div>
                      <div className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        Release: {row.expected_release_date
                          ? new Date(row.expected_release_date).toLocaleDateString()
                          : 'TBD'}
                      </div>
                    </div>
                    {row.notes && (
                      <p className="mt-2 text-xs italic text-muted-foreground">"{row.notes}"</p>
                    )}
                    {(row.status === 'reserved' || row.status === 'confirmed') && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => setFulfillTarget(row)}
                          className="gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Fulfill
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(row)}
                          className="gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!fulfillTarget} onOpenChange={(o) => !o && setFulfillTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fulfill Pre-Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Link this pre-order to a created order, or leave blank to mark fulfilled.
            </div>
            <div>
              <Label htmlFor="orderId">Order ID (optional)</Label>
              <Input
                id="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="UUID of the fulfilled order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillTarget(null)}>Cancel</Button>
            <Button onClick={handleFulfill} disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm Fulfill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PreOrderManager;
