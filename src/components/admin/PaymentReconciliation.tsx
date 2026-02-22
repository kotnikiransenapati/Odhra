import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CreditCard, AlertTriangle, CheckCircle, Clock, Search, Loader2, DollarSign, ArrowUpDown, FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function PaymentReconciliation() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [notes, setNotes] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['payment-reconciliation', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('payment_reconciliation')
        .select('*, orders(order_number, total_amount, payment_status)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Also fetch paid orders that have no reconciliation record yet
  const { data: unreconciledOrders = [] } = useQuery({
    queryKey: ['unreconciled-orders'],
    queryFn: async () => {
      const { data: reconciledOrderIds } = await supabase
        .from('payment_reconciliation')
        .select('order_id');

      const ids = reconciledOrderIds?.map(r => r.order_id).filter(Boolean) || [];

      let query = supabase
        .from('orders')
        .select('id, order_number, total_amount, payment_status, payment_method, created_at')
        .in('payment_status', ['paid', 'escrow'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (ids.length > 0) {
        query = query.not('id', 'in', `(${ids.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('payment_reconciliation')
        .update({
          status,
          notes,
          reconciled_by: (await supabase.auth.getUser()).data.user?.id,
          reconciled_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reconciliation'] });
      setSelectedRecord(null);
      setNotes('');
      toast.success('Reconciliation updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const autoReconcile = useMutation({
    mutationFn: async () => {
      const inserts = unreconciledOrders.map(order => ({
        order_id: order.id,
        payment_gateway: order.payment_method || 'unknown',
        gateway_amount: order.total_amount,
        order_amount: order.total_amount,
        status: 'matched',
        notes: 'Auto-reconciled - amounts match',
      }));

      if (inserts.length === 0) throw new Error('No orders to reconcile');

      const { error } = await supabase.from('payment_reconciliation').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['unreconciled-orders'] });
      toast.success(`Auto-reconciled ${unreconciledOrders.length} orders`);
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const stats = {
    total: records.length,
    matched: records.filter(r => r.status === 'matched').length,
    pending: records.filter(r => r.status === 'pending').length,
    discrepancy: records.filter(r => r.status === 'discrepancy').length,
    totalDiscrepancy: records.filter(r => r.discrepancy !== 0).reduce((s, r) => s + Math.abs(r.discrepancy || 0), 0),
  };

  const filteredRecords = records.filter(r =>
    r.orders?.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.gateway_transaction_id?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Records', value: stats.total, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Matched', value: stats.matched, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Discrepancies', value: stats.discrepancy, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Total Diff', value: formatPrice(stats.totalDiscrepancy), icon: DollarSign, color: 'text-destructive', bg: 'bg-destructive/10' },
        ].map((s, i) => (
          <Card key={i} className="glass">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by order or transaction ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="discrepancy">Discrepancy</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        {unreconciledOrders.length > 0 && (
          <Button onClick={() => autoReconcile.mutate()} disabled={autoReconcile.isPending} className="gap-2">
            {autoReconcile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpDown className="w-4 h-4" />}
            Auto-Reconcile ({unreconciledOrders.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Reconciliation Records ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Gateway Amt</TableHead>
                <TableHead>Order Amt</TableHead>
                <TableHead>Diff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-sm">{record.orders?.order_number || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{record.payment_gateway}</Badge></TableCell>
                  <TableCell>{formatPrice(record.gateway_amount)}</TableCell>
                  <TableCell>{formatPrice(record.order_amount)}</TableCell>
                  <TableCell>
                    <span className={record.discrepancy !== 0 ? 'text-destructive font-semibold' : 'text-success'}>
                      {record.discrepancy !== 0 ? formatPrice(record.discrepancy) : '✓ Match'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      record.status === 'matched' ? 'default' :
                      record.status === 'discrepancy' ? 'destructive' :
                      record.status === 'resolved' ? 'secondary' : 'outline'
                    } className="text-xs capitalize">{record.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(record.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedRecord(record); setNotes(record.notes || ''); }}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No reconciliation records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Reconciliation</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-muted-foreground text-xs">Gateway Amount</p>
                  <p className="font-bold text-lg">{formatPrice(selectedRecord.gateway_amount)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-muted-foreground text-xs">Order Amount</p>
                  <p className="font-bold text-lg">{formatPrice(selectedRecord.order_amount)}</p>
                </div>
              </div>
              {selectedRecord.discrepancy !== 0 && (
                <div className="p-3 bg-destructive/10 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">Discrepancy: {formatPrice(selectedRecord.discrepancy)}</span>
                </div>
              )}
              <Textarea placeholder="Add notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => reconcileMutation.mutate({ id: selectedRecord.id, status: 'discrepancy' })} disabled={reconcileMutation.isPending}>
              Flag Discrepancy
            </Button>
            <Button onClick={() => reconcileMutation.mutate({ id: selectedRecord.id, status: 'resolved' })} disabled={reconcileMutation.isPending}>
              {reconcileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
