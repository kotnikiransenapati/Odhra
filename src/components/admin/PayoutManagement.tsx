import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminPayouts, useProcessPayout, PayoutRequest } from '@/hooks/useAdmin';
import { downloadCsv } from '@/lib/csvExport';
import {
  Wallet,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  CreditCard,
  Download,
  Clock,
  TrendingUp,
} from 'lucide-react';

type StatusFilter = 'all' | 'approved' | 'rejected' | 'paid';

export function PayoutManagement() {
  const { data: payouts, isLoading } = useAdminPayouts();
  const processPayout = useProcessPayout();
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const pendingPayouts = payouts?.filter((p) => p.status === 'pending') || [];
  const allProcessed = payouts?.filter((p) => p.status !== 'pending') || [];
  const processedPayouts = useMemo(
    () =>
      statusFilter === 'all'
        ? allProcessed
        : allProcessed.filter((p) => p.status === statusFilter),
    [allProcessed, statusFilter]
  );

  const summary = useMemo(() => {
    const monthStart = startOfMonth(new Date()).getTime();
    const pendingTotal = pendingPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    const approvedMtd = allProcessed
      .filter(
        (p) =>
          (p.status === 'approved' || p.status === 'paid') &&
          p.processed_at &&
          new Date(p.processed_at).getTime() >= monthStart
      )
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const rejectedCount = allProcessed.filter((p) => p.status === 'rejected').length;
    return { pendingTotal, approvedMtd, rejectedCount };
  }, [pendingPayouts, allProcessed]);

  const handleExport = () => {
    downloadCsv('payouts', processedPayouts, [
      { key: 'vendor_name', label: 'Vendor' },
      { key: 'amount', label: 'Amount (INR)' },
      { key: 'status', label: 'Status' },
      { key: 'payment_method', label: 'Method' },
      { key: 'created_at', label: 'Requested' },
      { key: 'processed_at', label: 'Processed' },
      { key: 'admin_note', label: 'Note' },
    ]);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleProcess = () => {
    if (!selectedPayout || !action) return;

    processPayout.mutate(
      {
        payoutId: selectedPayout.id,
        status: action === 'approve' ? 'approved' : 'rejected',
        adminNote: adminNote || undefined,
      },
      {
        onSuccess: () => {
          setSelectedPayout(null);
          setAction(null);
          setAdminNote('');
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-warning">
              <Clock className="w-4 h-4" /> Pending value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(summary.pendingTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{pendingPayouts.length} request(s)</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-success">
              <TrendingUp className="w-4 h-4" /> Approved this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(summary.approvedMtd)}</div>
            <p className="text-xs text-muted-foreground mt-1">Month-to-date</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <XCircle className="w-4 h-4" /> Rejected (all-time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.rejectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Review reasons in history</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payouts */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-warning" />
            Pending Payouts ({pendingPayouts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPayouts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending payout requests</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayouts.map((payout, index) => (
                    <motion.tr
                      key={payout.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border"
                    >
                      <TableCell>
                        <p className="font-medium">{payout.vendor_name}</p>
                      </TableCell>
                      <TableCell className="font-bold text-accent">
                        {formatPrice(payout.amount)}
                      </TableCell>
                      <TableCell className="capitalize">{payout.payment_method}</TableCell>
                      <TableCell>
                        {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-success hover:text-success/80"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setAction('approve');
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setAction('reject');
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Payouts */}
      <Card className="glass">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payout History ({processedPayouts.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={processedPayouts.length === 0}
              >
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {processedPayouts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No payout history</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedPayouts.map((payout, index) => (
                    <motion.tr
                      key={payout.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border"
                    >
                      <TableCell>
                        <p className="font-medium">{payout.vendor_name}</p>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatPrice(payout.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell>
                        {payout.processed_at
                          ? format(new Date(payout.processed_at), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payout.admin_note || '-'}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Dialog */}
      <Dialog open={!!selectedPayout && !!action} onOpenChange={() => {
        setSelectedPayout(null);
        setAction(null);
        setAdminNote('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === 'approve' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-success" />
                  Approve Payout
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-destructive" />
                  Reject Payout
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-medium">{selectedPayout.vendor_name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-accent">{formatPrice(selectedPayout.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize">{selectedPayout.payment_method}</span>
                </div>
              </div>

              {selectedPayout.bank_details && (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Bank Details</span>
                  </div>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {Object.entries(selectedPayout.bank_details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Admin Note (Optional)</label>
                <Textarea
                  placeholder="Add a note..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPayout(null);
                setAction(null);
                setAdminNote('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={action === 'approve' ? 'default' : 'destructive'}
              onClick={handleProcess}
              disabled={processPayout.isPending}
            >
              {processPayout.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : action === 'approve' ? (
                'Approve Payout'
              ) : (
                'Reject Payout'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
