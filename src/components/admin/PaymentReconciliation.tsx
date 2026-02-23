import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard, AlertTriangle, CheckCircle, Clock, Search, Loader2, DollarSign,
  ArrowUpDown, FileText, BarChart3, TrendingUp, Download,
} from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

export function PaymentReconciliation() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['payment-reconciliation', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('payment_reconciliation')
        .select('*, orders(order_number, total_amount, payment_status, payment_method, created_at)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

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
        .limit(100);

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

  // Date-filtered records
  const filteredByDate = useMemo(() => {
    if (dateRange === 'all') return records;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = subDays(new Date(), days);
    return records.filter(r => isAfter(new Date(r.created_at), cutoff));
  }, [records, dateRange]);

  const filteredRecords = filteredByDate.filter(r =>
    r.orders?.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.gateway_transaction_id?.toLowerCase().includes(search.toLowerCase())
  );

  // Gateway breakdown
  const gatewayBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number; discrepancy: number; matched: number }>();
    for (const r of filteredByDate) {
      const gw = r.payment_gateway || 'unknown';
      const existing = map.get(gw) || { count: 0, total: 0, discrepancy: 0, matched: 0 };
      existing.count += 1;
      existing.total += r.gateway_amount || 0;
      existing.discrepancy += Math.abs(r.discrepancy || 0);
      if (r.status === 'matched') existing.matched += 1;
      map.set(gw, existing);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [filteredByDate]);

  const stats = {
    total: filteredByDate.length,
    matched: filteredByDate.filter(r => r.status === 'matched').length,
    pending: filteredByDate.filter(r => r.status === 'pending').length,
    discrepancy: filteredByDate.filter(r => r.status === 'discrepancy').length,
    totalVolume: filteredByDate.reduce((s, r) => s + (r.gateway_amount || 0), 0),
    totalDiscrepancy: filteredByDate.filter(r => r.discrepancy !== 0).reduce((s, r) => s + Math.abs(r.discrepancy || 0), 0),
    matchRate: filteredByDate.length > 0
      ? Math.round((filteredByDate.filter(r => r.status === 'matched').length / filteredByDate.length) * 100)
      : 0,
  };

  const exportCSV = () => {
    const headers = ['Order', 'Gateway', 'Gateway Amount', 'Order Amount', 'Discrepancy', 'Status', 'Date'];
    const rows = filteredRecords.map(r => [
      r.orders?.order_number || '',
      r.payment_gateway,
      r.gateway_amount,
      r.order_amount,
      r.discrepancy || 0,
      r.status,
      format(new Date(r.created_at), 'yyyy-MM-dd'),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported CSV');
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Matched', value: stats.matched, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Discrepancies', value: stats.discrepancy, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Match Rate', value: `${stats.matchRate}%`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Volume', value: formatPrice(stats.totalVolume), icon: DollarSign, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Total Diff', value: formatPrice(stats.totalDiscrepancy), icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
        ].map((s, i) => (
          <Card key={i} className="glass">
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records" className="gap-1.5">
            <CreditCard className="w-4 h-4" /> Records
          </TabsTrigger>
          <TabsTrigger value="gateway" className="gap-1.5">
            <BarChart3 className="w-4 h-4" /> Gateway Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4 space-y-4">
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by order or transaction ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="discrepancy">Discrepancy</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={exportCSV} title="Export CSV">
              <Download className="w-4 h-4" />
            </Button>
            {unreconciledOrders.length > 0 && (
              <Button onClick={() => autoReconcile.mutate()} disabled={autoReconcile.isPending} className="gap-2">
                {autoReconcile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpDown className="w-4 h-4" />}
                Auto-Reconcile ({unreconciledOrders.length})
              </Button>
            )}
          </div>

          {/* Table */}
          <Card className="glass">
            <CardContent className="p-0">
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
                          {record.discrepancy !== 0 ? formatPrice(record.discrepancy) : '✓'}
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
        </TabsContent>

        <TabsContent value="gateway" className="mt-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" /> Gateway Breakdown
              </CardTitle>
              <CardDescription>Payment volume and match rate by gateway</CardDescription>
            </CardHeader>
            <CardContent>
              {gatewayBreakdown.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-4">
                  {gatewayBreakdown.map(([gateway, data]) => {
                    const matchRate = data.count > 0 ? Math.round((data.matched / data.count) * 100) : 0;
                    return (
                      <div key={gateway} className="p-4 rounded-xl bg-secondary/30 border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                              <h4 className="font-semibold capitalize">{gateway}</h4>
                              <p className="text-xs text-muted-foreground">{data.count} transactions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatPrice(data.total)}</p>
                            <p className="text-xs text-muted-foreground">Total Volume</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-2 rounded-lg bg-background/50">
                            <p className={`text-lg font-bold ${matchRate >= 90 ? 'text-success' : matchRate >= 70 ? 'text-warning' : 'text-destructive'}`}>
                              {matchRate}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">Match Rate</p>
                          </div>
                          <div className="p-2 rounded-lg bg-background/50">
                            <p className="text-lg font-bold text-success">{data.matched}</p>
                            <p className="text-[10px] text-muted-foreground">Matched</p>
                          </div>
                          <div className="p-2 rounded-lg bg-background/50">
                            <p className={`text-lg font-bold ${data.discrepancy > 0 ? 'text-destructive' : 'text-success'}`}>
                              {data.discrepancy > 0 ? formatPrice(data.discrepancy) : '₹0'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Discrepancy</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              {selectedRecord.gateway_transaction_id && (
                <div className="p-2 bg-secondary/20 rounded-lg text-sm">
                  <span className="text-muted-foreground">Transaction ID: </span>
                  <code className="font-mono">{selectedRecord.gateway_transaction_id}</code>
                </div>
              )}
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
