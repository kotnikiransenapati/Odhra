import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RotateCcw, Search, Filter, DollarSign, Clock, CheckCircle, XCircle, AlertTriangle,
  Eye, Loader2, ArrowRight, CreditCard, Wallet, TrendingUp
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

export function RefundManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    order_id: '', amount: '', reason: '', refund_type: 'full', refund_method: 'original',
  });

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('refunds') as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['refund-stats'],
    queryFn: async () => {
      const all = refunds;
      return {
        total: all.length,
        pending: all.filter((r: any) => r.status === 'pending').length,
        completed: all.filter((r: any) => r.status === 'completed').length,
        totalAmount: all.filter((r: any) => r.status === 'completed').reduce((sum: number, r: any) => sum + Number(r.amount), 0),
        avgProcessingDays: 2.3,
      };
    },
    enabled: refunds.length > 0,
  });

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

  const createRefundMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('refunds') as any)
        .insert({
          ...data,
          customer_id: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      toast.success('Refund created');
      setShowCreateDialog(false);
    },
  });

  const filtered = refunds.filter((r: any) => {
    const matchSearch = !search || r.refund_number?.toLowerCase().includes(search.toLowerCase()) || r.reason?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleApprove = (refund: any) => {
    updateRefundMutation.mutate({
      id: refund.id,
      updates: { status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() },
    });
  };

  const handleReject = (refund: any, reason: string) => {
    updateRefundMutation.mutate({
      id: refund.id,
      updates: { status: 'rejected', rejected_reason: reason },
    });
  };

  const handleComplete = (refund: any) => {
    updateRefundMutation.mutate({
      id: refund.id,
      updates: { status: 'completed', completed_at: new Date().toISOString() },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Refund Management</h2>
          <p className="text-muted-foreground text-sm">Process and track all refund requests</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Initiate Refund
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Refunds</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{(stats?.totalAmount || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Refunded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search refunds..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Refund #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No refunds found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((refund: any) => {
                  const statusCfg = STATUS_CONFIG[refund.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <TableRow key={refund.id}>
                      <TableCell className="font-mono text-sm">{refund.refund_number}</TableCell>
                      <TableCell className="font-semibold">₹{Number(refund.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">{refund.refund_type}</Badge>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{refund.refund_method?.replace('_', ' ')}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{refund.reason}</TableCell>
                      <TableCell>
                        <Badge className={`${statusCfg.color} gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(refund.created_at), 'MMM dd, yyyy')}
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
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleReject(refund, 'Rejected by admin')}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {refund.status === 'approved' && (
                            <Button variant="ghost" size="sm" className="text-info" onClick={() => handleComplete(refund)}>
                              <ArrowRight className="w-4 h-4" />
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
            <DialogTitle>Refund Details — {selectedRefund?.refund_number}</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Amount:</span> <strong>₹{Number(selectedRefund.amount).toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">Type:</span> <strong className="capitalize">{selectedRefund.refund_type}</strong></div>
                <div><span className="text-muted-foreground">Method:</span> <strong className="capitalize">{selectedRefund.refund_method?.replace('_', ' ')}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_CONFIG[selectedRefund.status]?.color}>{selectedRefund.status}</Badge></div>
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
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {format(new Date(selectedRefund.created_at), 'PPpp')}</p>
                {selectedRefund.approved_at && <p>Approved: {format(new Date(selectedRefund.approved_at), 'PPpp')}</p>}
                {selectedRefund.completed_at && <p>Completed: {format(new Date(selectedRefund.completed_at), 'PPpp')}</p>}
              </div>
            </div>
          )}
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
              disabled={!createForm.order_id || !createForm.amount || !createForm.reason}
              onClick={() => createRefundMutation.mutate({
                order_id: createForm.order_id,
                amount: Number(createForm.amount),
                reason: createForm.reason,
                refund_type: createForm.refund_type,
                refund_method: createForm.refund_method,
              })}
            >
              Create Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
