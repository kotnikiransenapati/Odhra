import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAdminReturns, useUpdateReturn } from '@/hooks/useReturns';
import {
  RotateCcw, Search, Loader2, Eye, CheckCircle, XCircle,
  Truck, Package, Clock, Download,
} from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  pending: { color: 'bg-warning/10 text-warning', label: 'Pending Review', icon: Clock },
  approved: { color: 'bg-info/10 text-info', label: 'Approved', icon: CheckCircle },
  rejected: { color: 'bg-destructive/10 text-destructive', label: 'Rejected', icon: XCircle },
  pickup_scheduled: { color: 'bg-accent/10 text-accent', label: 'Pickup Scheduled', icon: Truck },
  picked_up: { color: 'bg-info/10 text-info', label: 'Picked Up', icon: Truck },
  received: { color: 'bg-info/10 text-info', label: 'Received', icon: Package },
  inspected: { color: 'bg-success/10 text-success', label: 'Inspected', icon: Eye },
  refund_initiated: { color: 'bg-warning/10 text-warning', label: 'Refund Initiated', icon: RotateCcw },
  refund_completed: { color: 'bg-success/10 text-success', label: 'Refund Completed', icon: CheckCircle },
  cancelled: { color: 'bg-muted text-muted-foreground', label: 'Cancelled', icon: XCircle },
};

const reasonLabels: Record<string, string> = {
  defective: 'Defective Product',
  wrong_item: 'Wrong Item Received',
  not_as_described: 'Not as Described',
  size_issue: 'Size/Fit Issue',
  quality_issue: 'Quality Issue',
  changed_mind: 'Changed Mind',
  damaged_in_transit: 'Damaged in Transit',
  other: 'Other',
};

export function ReturnManagement() {
  const { data: returns, isLoading } = useAdminReturns();
  const updateReturn = useUpdateReturn();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const filteredReturns = returns?.filter((ret: any) => {
    const matchesSearch =
      ret.return_number?.toLowerCase().includes(search.toLowerCase()) ||
      ret.orders?.order_number?.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && ret.status === statusFilter;
  });

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const handleApprove = async (returnId: string) => {
    await updateReturn.mutateAsync({
      returnId,
      updates: {
        status: 'approved',
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes || undefined,
      },
    });
    setSelectedReturn(null);
    setAdminNotes('');
    toast.success('Return approved');
  };

  const handleReject = async (returnId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    await updateReturn.mutateAsync({
      returnId,
      updates: {
        status: 'rejected',
        rejected_reason: rejectionReason,
        admin_notes: adminNotes || undefined,
      },
    });
    setSelectedReturn(null);
    setAdminNotes('');
    setRejectionReason('');
    setShowRejectForm(false);
    toast.success('Return rejected');
  };

  const handleStatusUpdate = async (returnId: string, newStatus: string) => {
    const extraUpdates: Record<string, any> = {};
    if (newStatus === 'picked_up') extraUpdates.picked_up_at = new Date().toISOString();
    if (newStatus === 'received') extraUpdates.received_at = new Date().toISOString();
    if (newStatus === 'inspected') extraUpdates.inspected_at = new Date().toISOString();

    await updateReturn.mutateAsync({
      returnId,
      updates: { status: newStatus, ...extraUpdates },
    });
    toast.success(`Status updated to ${statusConfig[newStatus]?.label || newStatus}`);
  };

  const exportCSV = () => {
    if (!filteredReturns?.length) return;
    const headers = ['Return #', 'Order #', 'Vendor', 'Reason', 'Refund', 'Status', 'Date'];
    const rows = filteredReturns.map((r: any) => [
      r.return_number, r.orders?.order_number || '', r.vendors?.brand_name || '',
      reasonLabels[r.return_reason] || r.return_reason, r.refund_amount || 0, r.status,
      format(new Date(r.created_at), 'yyyy-MM-dd'),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `returns-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported CSV');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  }

  const stats = {
    pending: returns?.filter((r: any) => r.status === 'pending').length || 0,
    approved: returns?.filter((r: any) => ['approved', 'pickup_scheduled', 'picked_up'].includes(r.status)).length || 0,
    completed: returns?.filter((r: any) => r.status === 'refund_completed').length || 0,
    rejected: returns?.filter((r: any) => r.status === 'rejected').length || 0,
    totalRefundValue: returns?.filter((r: any) => r.status === 'refund_completed').reduce((s: number, r: any) => s + (r.refund_amount || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'In Process', value: stats.approved, icon: Truck, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Refunded', value: formatPrice(stats.totalRefundValue), icon: RotateCcw, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((s, i) => (
          <Card key={i} className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search returns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="inspected">Inspected</SelectItem>
            <SelectItem value="refund_initiated">Refund Initiated</SelectItem>
            <SelectItem value="refund_completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-2" />Export</Button>
      </div>

      {/* Returns Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Return Requests ({filteredReturns?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns?.map((ret: any, index: number) => {
                  const status = statusConfig[ret.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <motion.tr
                      key={ret.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border cursor-pointer hover:bg-muted/50"
                      onClick={() => { setSelectedReturn(ret); setShowRejectForm(false); setRejectionReason(''); setAdminNotes(''); }}
                    >
                      <TableCell className="font-medium">{ret.return_number}</TableCell>
                      <TableCell>{ret.orders?.order_number}</TableCell>
                      <TableCell>{ret.vendors?.brand_name || 'N/A'}</TableCell>
                      <TableCell><span className="text-sm">{reasonLabels[ret.return_reason] || ret.return_reason}</span></TableCell>
                      <TableCell className="font-semibold">{ret.refund_amount ? formatPrice(ret.refund_amount) : '-'}</TableCell>
                      <TableCell>
                        <Badge className={`${status.color} gap-1`}><StatusIcon className="w-3 h-3" />{status.label}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(ret.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedReturn(ret); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  );
                })}
                {(!filteredReturns || filteredReturns.length === 0) && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No return requests found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Return Detail Dialog */}
      <Dialog open={!!selectedReturn} onOpenChange={() => { setSelectedReturn(null); setShowRejectForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Return Request Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            {selectedReturn && (
              <div className="space-y-6 p-1">
                {/* Return Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Return Number</p>
                    <p className="font-medium">{selectedReturn.return_number}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Order Number</p>
                    <p className="font-medium">{selectedReturn.orders?.order_number}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Reason</p>
                    <p className="font-medium">{reasonLabels[selectedReturn.return_reason] || selectedReturn.return_reason}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Refund Amount</p>
                    <p className="font-semibold text-primary">
                      {selectedReturn.refund_amount ? formatPrice(selectedReturn.refund_amount) : 'To be calculated'}
                    </p>
                  </div>
                </div>

                {selectedReturn.return_reason_details && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Details</p>
                    <p className="text-sm">{selectedReturn.return_reason_details}</p>
                  </div>
                )}

                {/* Images */}
                {selectedReturn.images && selectedReturn.images.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Evidence Images</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedReturn.images.map((img: string, i: number) => (
                        <img key={i} src={img} alt={`Evidence ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Return Items */}
                {selectedReturn.return_items && selectedReturn.return_items.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Items</p>
                    <div className="space-y-2">
                      {selectedReturn.return_items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          {item.order_items?.product_image && (
                            <img src={item.order_items.product_image} alt="" className="w-12 h-12 object-cover rounded" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.order_items?.product_title}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity} · {item.refund_amount ? formatPrice(item.refund_amount) : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Status Update for Pending */}
                {selectedReturn.status === 'pending' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Admin Notes (optional)</label>
                      <Textarea placeholder="Add notes..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} />
                    </div>
                    <div className="flex gap-3">
                      <Button className="flex-1" onClick={() => handleApprove(selectedReturn.id)} disabled={updateReturn.isPending}>
                        <CheckCircle className="w-4 h-4 mr-2" />Approve Return
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => setShowRejectForm(true)}>
                        <XCircle className="w-4 h-4 mr-2" />Reject Return
                      </Button>
                    </div>

                    {showRejectForm && (
                      <div className="space-y-2 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                        <label className="text-sm font-medium">Rejection Reason (required)</label>
                        <Textarea
                          placeholder="Explain why the return is being rejected..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                        />
                        <Button variant="destructive" className="w-full" onClick={() => handleReject(selectedReturn.id)} disabled={updateReturn.isPending || !rejectionReason.trim()}>
                          Confirm Rejection
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejected Info */}
                {selectedReturn.status === 'rejected' && selectedReturn.rejected_reason && (
                  <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-1">Rejection Reason</p>
                    <p className="text-sm">{selectedReturn.rejected_reason}</p>
                  </div>
                )}

                {/* Status Progression for Approved Returns */}
                {['approved', 'pickup_scheduled', 'picked_up', 'received', 'inspected', 'refund_initiated'].includes(selectedReturn.status) && (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Update Status</p>
                    <Select value={selectedReturn.status} onValueChange={(value) => handleStatusUpdate(selectedReturn.id, value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
                        <SelectItem value="picked_up">Picked Up</SelectItem>
                        <SelectItem value="received">Received at Warehouse</SelectItem>
                        <SelectItem value="inspected">Inspected</SelectItem>
                        <SelectItem value="refund_initiated">Refund Initiated</SelectItem>
                        <SelectItem value="refund_completed">Refund Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Admin/Vendor Notes */}
                {(selectedReturn.admin_notes || selectedReturn.vendor_notes) && (
                  <div className="space-y-2">
                    {selectedReturn.admin_notes && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                        <p className="text-sm">{selectedReturn.admin_notes}</p>
                      </div>
                    )}
                    {selectedReturn.vendor_notes && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs text-muted-foreground mb-1">Vendor Notes</p>
                        <p className="text-sm">{selectedReturn.vendor_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
