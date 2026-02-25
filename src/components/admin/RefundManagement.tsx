import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  RotateCcw, Search, DollarSign, Clock, CheckCircle, XCircle, AlertTriangle,
  Eye, Loader2, ArrowRight, CreditCard, Wallet, TrendingUp, Zap, RefreshCw,
  FileText, Timer, ShieldAlert, Send
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  approved: { label: 'Approved', color: 'bg-info/10 text-info border-info/20', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-accent/10 text-accent border-accent/20', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  failed: { label: 'Failed', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
};

const GATEWAY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-warning' },
  initiated: { label: 'Initiated', color: 'text-info' },
  processed: { label: 'Processed', color: 'text-success' },
  failed: { label: 'Failed', color: 'text-destructive' },
  wallet_credited: { label: 'Wallet Credited', color: 'text-success' },
};

function SlaIndicator({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-xs text-muted-foreground">—</span>;
  const deadlineDate = new Date(deadline);
  const overdue = isPast(deadlineDate);
  const hoursLeft = differenceInHours(deadlineDate, new Date());

  if (overdue) {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-xs">
        <ShieldAlert className="w-3 h-3" />
        SLA Breached
      </Badge>
    );
  }
  if (hoursLeft <= 12) {
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1 text-xs">
        <Timer className="w-3 h-3" />
        {hoursLeft}h left
      </Badge>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">
      {formatDistanceToNow(deadlineDate, { addSuffix: true })}
    </span>
  );
}

export function RefundManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState<any>(null);
  const [createForm, setCreateForm] = useState({
    order_id: '', amount: '', reason: '', refund_type: 'full', refund_method: 'original',
  });

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('refunds') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Compute stats from refunds
  const stats = React.useMemo(() => {
    const total = refunds.length;
    const pending = refunds.filter((r: any) => r.status === 'pending').length;
    const approved = refunds.filter((r: any) => r.status === 'approved').length;
    const completed = refunds.filter((r: any) => r.status === 'completed').length;
    const processing = refunds.filter((r: any) => r.status === 'processing').length;
    const totalRefunded = refunds
      .filter((r: any) => r.status === 'completed')
      .reduce((sum: number, r: any) => sum + Number(r.amount), 0);
    const slaBreached = refunds.filter(
      (r: any) => r.sla_deadline && isPast(new Date(r.sla_deadline)) && !['completed', 'rejected', 'failed'].includes(r.status)
    ).length;
    const autoProcessed = refunds.filter((r: any) => r.auto_processed).length;
    return { total, pending, approved, completed, processing, totalRefunded, slaBreached, autoProcessed };
  }, [refunds]);

  const updateRefundMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await (supabase.from('refunds') as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      toast.success('Refund updated');
      setSelectedRefund(null);
    },
  });

  const processGatewayMutation = useMutation({
    mutationFn: async ({ refundId, action }: { refundId: string; action: string }) => {
      const { data, error } = await supabase.functions.invoke('process-razorpay-refund', {
        body: { refund_id: refundId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      toast.success(data.message || 'Refund processed');
      setSelectedRefund(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createRefundMutation = useMutation({
    mutationFn: async (data: any) => {
      // Lookup order to get payment_id and customer_id
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id, payment_id')
        .eq('id', data.order_id)
        .single();

      if (!order) throw new Error('Order not found');

      const { error } = await (supabase.from('refunds') as any)
        .insert({
          ...data,
          refund_number: '',
          customer_id: order.customer_id,
          razorpay_payment_id: order.payment_id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      toast.success('Refund created');
      setShowCreateDialog(false);
      setCreateForm({ order_id: '', amount: '', reason: '', refund_type: 'full', refund_method: 'original' });
    },
  });

  const filtered = refunds.filter((r: any) => {
    const matchSearch = !search ||
      r.refund_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.reason?.toLowerCase().includes(search.toLowerCase()) ||
      r.credit_note_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleApprove = (refund: any) => {
    updateRefundMutation.mutate({
      id: refund.id,
      updates: { status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() },
    });
  };

  const handleReject = (refund: any) => {
    updateRefundMutation.mutate({
      id: refund.id,
      updates: { status: 'rejected', rejected_reason: rejectReason || 'Rejected by admin' },
    });
    setShowRejectDialog(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Refund Management</h2>
          <p className="text-muted-foreground text-sm">Razorpay-integrated refund processing with SLA tracking</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Initiate Refund
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: RotateCcw, bg: 'bg-accent/10', fg: 'text-accent' },
          { label: 'Pending', value: stats.pending, icon: Clock, bg: 'bg-warning/10', fg: 'text-warning' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, bg: 'bg-info/10', fg: 'text-info' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, bg: 'bg-success/10', fg: 'text-success' },
          { label: 'SLA Breached', value: stats.slaBreached, icon: ShieldAlert, bg: 'bg-destructive/10', fg: 'text-destructive' },
          { label: 'Refunded', value: `₹${stats.totalRefunded.toLocaleString()}`, icon: DollarSign, bg: 'bg-primary/10', fg: 'text-primary' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                <kpi.icon className={`w-4 h-4 ${kpi.fg}`} />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search refunds, credit notes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Refund #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Credit Note</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No refunds found</TableCell></TableRow>
              ) : (
                filtered.slice(0, 50).map((refund: any) => {
                  const statusCfg = STATUS_CONFIG[refund.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  const gwStatus = GATEWAY_STATUS_MAP[refund.gateway_status] || null;
                  return (
                    <TableRow key={refund.id}>
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm">{refund.refund_number}</p>
                          {refund.auto_processed && (
                            <Badge variant="outline" className="text-[10px] mt-0.5 gap-0.5"><Zap className="w-2.5 h-2.5" />Auto</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">₹{Number(refund.amount).toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{refund.refund_type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs gap-1">
                          {refund.refund_method === 'original' ? <CreditCard className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                          {refund.refund_method?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {gwStatus ? (
                          <span className={`text-xs font-medium ${gwStatus.color}`}>{gwStatus.label}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusCfg.color} gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!['completed', 'rejected', 'failed'].includes(refund.status) && (
                          <SlaIndicator deadline={refund.sla_deadline} />
                        )}
                      </TableCell>
                      <TableCell>
                        {refund.credit_note_number ? (
                          <span className="font-mono text-xs text-success">{refund.credit_note_number}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(refund.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRefund(refund)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {refund.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-success" onClick={() => handleApprove(refund)}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowRejectDialog(refund)}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {refund.status === 'approved' && refund.refund_method === 'original' && refund.razorpay_payment_id && (
                            <Button
                              variant="ghost" size="sm" className="text-info gap-1"
                              disabled={processGatewayMutation.isPending}
                              onClick={() => processGatewayMutation.mutate({ refundId: refund.id, action: 'process_gateway' })}
                            >
                              {processGatewayMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                          )}
                          {refund.status === 'approved' && (refund.refund_method === 'wallet' || refund.refund_method === 'store_credit') && (
                            <Button
                              variant="ghost" size="sm" className="text-success gap-1"
                              disabled={processGatewayMutation.isPending}
                              onClick={() => processGatewayMutation.mutate({ refundId: refund.id, action: 'process_wallet' })}
                            >
                              {processGatewayMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                            </Button>
                          )}
                          {refund.status === 'processing' && refund.razorpay_refund_id && (
                            <Button
                              variant="ghost" size="sm" className="text-accent gap-1"
                              disabled={processGatewayMutation.isPending}
                              onClick={() => processGatewayMutation.mutate({ refundId: refund.id, action: 'check_status' })}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRefund} onOpenChange={() => setSelectedRefund(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Refund — {selectedRefund?.refund_number}
              {selectedRefund?.auto_processed && <Badge variant="outline" className="text-xs gap-0.5"><Zap className="w-3 h-3" />Auto-created from return</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Amount:</span> <strong>₹{Number(selectedRefund.amount).toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">Type:</span> <strong className="capitalize">{selectedRefund.refund_type}</strong></div>
                <div><span className="text-muted-foreground">Method:</span> <strong className="capitalize">{selectedRefund.refund_method?.replace('_', ' ')}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_CONFIG[selectedRefund.status]?.color}>{selectedRefund.status}</Badge></div>
              </div>

              {/* Gateway Details */}
              {(selectedRefund.razorpay_refund_id || selectedRefund.razorpay_payment_id) && (
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />Razorpay Gateway</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 text-sm space-y-1">
                    {selectedRefund.razorpay_payment_id && <p><span className="text-muted-foreground">Payment ID:</span> <code className="text-xs">{selectedRefund.razorpay_payment_id}</code></p>}
                    {selectedRefund.razorpay_refund_id && <p><span className="text-muted-foreground">Refund ID:</span> <code className="text-xs">{selectedRefund.razorpay_refund_id}</code></p>}
                    <p><span className="text-muted-foreground">Gateway Status:</span> <strong className={GATEWAY_STATUS_MAP[selectedRefund.gateway_status]?.color || ''}>{selectedRefund.gateway_status || 'N/A'}</strong></p>
                    {selectedRefund.speed && <p><span className="text-muted-foreground">Speed:</span> <span className="capitalize">{selectedRefund.speed}</span></p>}
                  </CardContent>
                </Card>
              )}

              {/* SLA & Credit Note */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">SLA Deadline</p>
                  <SlaIndicator deadline={selectedRefund.sla_deadline} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Credit Note</p>
                  {selectedRefund.credit_note_number ? (
                    <Badge variant="outline" className="gap-1"><FileText className="w-3 h-3" />{selectedRefund.credit_note_number}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Generated on completion</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="text-sm mt-1">{selectedRefund.reason}</p>
              </div>
              {selectedRefund.admin_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Admin Notes</p>
                  <p className="text-sm mt-1">{selectedRefund.admin_notes}</p>
                </div>
              )}
              {selectedRefund.rejected_reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Rejection Reason</p>
                  <p className="text-sm mt-1 text-destructive">{selectedRefund.rejected_reason}</p>
                </div>
              )}
              <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                <p>Created: {format(new Date(selectedRefund.created_at), 'PPpp')}</p>
                {selectedRefund.approved_at && <p>Approved: {format(new Date(selectedRefund.approved_at), 'PPpp')}</p>}
                {selectedRefund.processed_at && <p>Processing Started: {format(new Date(selectedRefund.processed_at), 'PPpp')}</p>}
                {selectedRefund.completed_at && <p>Completed: {format(new Date(selectedRefund.completed_at), 'PPpp')}</p>}
              </div>

              {/* Quick Actions from Detail */}
              <div className="flex gap-2 pt-2 border-t">
                {selectedRefund.status === 'approved' && selectedRefund.razorpay_payment_id && selectedRefund.refund_method === 'original' && (
                  <Button
                    size="sm" className="gap-1"
                    disabled={processGatewayMutation.isPending}
                    onClick={() => processGatewayMutation.mutate({ refundId: selectedRefund.id, action: 'process_gateway' })}
                  >
                    {processGatewayMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Process via Razorpay
                  </Button>
                )}
                {selectedRefund.status === 'approved' && (selectedRefund.refund_method === 'wallet' || selectedRefund.refund_method === 'store_credit') && (
                  <Button
                    size="sm" variant="outline" className="gap-1"
                    disabled={processGatewayMutation.isPending}
                    onClick={() => processGatewayMutation.mutate({ refundId: selectedRefund.id, action: 'process_wallet' })}
                  >
                    {processGatewayMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    Credit to Wallet
                  </Button>
                )}
                {selectedRefund.status === 'processing' && selectedRefund.razorpay_refund_id && (
                  <Button
                    size="sm" variant="outline" className="gap-1"
                    disabled={processGatewayMutation.isPending}
                    onClick={() => processGatewayMutation.mutate({ refundId: selectedRefund.id, action: 'check_status' })}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Check Gateway Status
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showRejectDialog} onOpenChange={() => { setShowRejectDialog(null); setRejectReason(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Provide a reason for rejecting refund {showRejectDialog?.refund_number}:</p>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowRejectDialog(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={() => handleReject(showRejectDialog)}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Order ID</label>
              <Input value={createForm.order_id} onChange={e => setCreateForm(p => ({ ...p, order_id: e.target.value }))} placeholder="Paste order UUID" />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input type="number" value={createForm.amount} onChange={e => setCreateForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={createForm.refund_type} onValueChange={v => setCreateForm(p => ({ ...p, refund_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Refund</SelectItem>
                    <SelectItem value="partial">Partial Refund</SelectItem>
                    <SelectItem value="item_level">Item Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Method</label>
                <Select value={createForm.refund_method} onValueChange={v => setCreateForm(p => ({ ...p, refund_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original Payment</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="store_credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea value={createForm.reason} onChange={e => setCreateForm(p => ({ ...p, reason: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              disabled={!createForm.order_id || !createForm.amount || !createForm.reason || createRefundMutation.isPending}
              onClick={() => createRefundMutation.mutate({
                order_id: createForm.order_id,
                amount: Number(createForm.amount),
                reason: createForm.reason,
                refund_type: createForm.refund_type,
                refund_method: createForm.refund_method,
              })}
            >
              {createRefundMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Create Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
