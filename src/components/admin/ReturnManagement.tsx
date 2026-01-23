import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminReturns, useUpdateReturn } from '@/hooks/useReturns';
import {
  RotateCcw,
  Search,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  Clock,
  AlertTriangle,
} from 'lucide-react';

const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  pending: { color: 'bg-yellow-500/10 text-yellow-500', label: 'Pending Review', icon: Clock },
  approved: { color: 'bg-blue-500/10 text-blue-500', label: 'Approved', icon: CheckCircle },
  rejected: { color: 'bg-red-500/10 text-red-500', label: 'Rejected', icon: XCircle },
  pickup_scheduled: { color: 'bg-purple-500/10 text-purple-500', label: 'Pickup Scheduled', icon: Truck },
  picked_up: { color: 'bg-indigo-500/10 text-indigo-500', label: 'Picked Up', icon: Truck },
  received: { color: 'bg-cyan-500/10 text-cyan-500', label: 'Received', icon: Package },
  inspected: { color: 'bg-teal-500/10 text-teal-500', label: 'Inspected', icon: Eye },
  refund_initiated: { color: 'bg-orange-500/10 text-orange-500', label: 'Refund Initiated', icon: RotateCcw },
  refund_completed: { color: 'bg-green-500/10 text-green-500', label: 'Refund Completed', icon: CheckCircle },
  cancelled: { color: 'bg-gray-500/10 text-gray-500', label: 'Cancelled', icon: XCircle },
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

  const filteredReturns = returns?.filter((ret: any) => {
    const matchesSearch =
      ret.return_number.toLowerCase().includes(search.toLowerCase()) ||
      ret.orders?.order_number?.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && ret.status === statusFilter;
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
  };

  const handleReject = async (returnId: string) => {
    if (!rejectionReason.trim()) {
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
  };

  const handleStatusUpdate = async (returnId: string, newStatus: string) => {
    await updateReturn.mutateAsync({
      returnId,
      updates: { status: newStatus },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const stats = {
    pending: returns?.filter((r: any) => r.status === 'pending').length || 0,
    approved: returns?.filter((r: any) => ['approved', 'pickup_scheduled', 'picked_up'].includes(r.status)).length || 0,
    completed: returns?.filter((r: any) => r.status === 'refund_completed').length || 0,
    rejected: returns?.filter((r: any) => r.status === 'rejected').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Truck className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">In Process</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search returns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
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
                      onClick={() => setSelectedReturn(ret)}
                    >
                      <TableCell className="font-medium">{ret.return_number}</TableCell>
                      <TableCell>{ret.orders?.order_number}</TableCell>
                      <TableCell>{ret.vendors?.brand_name || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="text-sm">{reasonLabels[ret.return_reason] || ret.return_reason}</span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {ret.refund_amount ? formatPrice(ret.refund_amount) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(ret.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedReturn(ret); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Return Detail Dialog */}
      <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Return Request Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            {selectedReturn && (
              <div className="space-y-6 p-1">
                {/* Return Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Return Number</p>
                    <p className="font-medium">{selectedReturn.return_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-medium">{selectedReturn.orders?.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{reasonLabels[selectedReturn.return_reason]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Refund Amount</p>
                    <p className="font-semibold text-primary">
                      {selectedReturn.refund_amount ? formatPrice(selectedReturn.refund_amount) : 'To be calculated'}
                    </p>
                  </div>
                </div>

                {/* Additional Details */}
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
                        <img
                          key={i}
                          src={img}
                          alt={`Evidence ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
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
                            <img
                              src={item.order_items.product_image}
                              alt=""
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.order_items?.product_title}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Update for Pending */}
                {selectedReturn.status === 'pending' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Admin Notes</label>
                      <Textarea
                        placeholder="Add notes (optional)..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        className="flex-1"
                        onClick={() => handleApprove(selectedReturn.id)}
                        disabled={updateReturn.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Return
                      </Button>
                      <Dialog>
                        <Button variant="destructive" className="flex-1">
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Return
                        </Button>
                      </Dialog>
                    </div>
                    {/* Rejection form */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Rejection Reason (required)</label>
                      <Textarea
                        placeholder="Explain why the return is being rejected..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                      />
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleReject(selectedReturn.id)}
                        disabled={updateReturn.isPending || !rejectionReason.trim()}
                      >
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Progression for Approved Returns */}
                {['approved', 'pickup_scheduled', 'picked_up', 'received', 'inspected', 'refund_initiated'].includes(selectedReturn.status) && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm font-medium">Update Status</p>
                    <Select
                      value={selectedReturn.status}
                      onValueChange={(value) => handleStatusUpdate(selectedReturn.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
