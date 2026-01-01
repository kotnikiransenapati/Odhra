import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
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
import { useAdminPayouts, useProcessPayout, PayoutRequest } from '@/hooks/useAdmin';
import {
  Wallet,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  CreditCard,
} from 'lucide-react';

export function PayoutManagement() {
  const { data: payouts, isLoading } = useAdminPayouts();
  const processPayout = useProcessPayout();
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const pendingPayouts = payouts?.filter((p) => p.status === 'pending') || [];
  const processedPayouts = payouts?.filter((p) => p.status !== 'pending') || [];

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
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
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
      {/* Pending Payouts */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-yellow-500" />
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
                            className="text-green-500 hover:text-green-600"
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
                            className="text-red-500 hover:text-red-600"
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
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payout History ({processedPayouts.length})
          </CardTitle>
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
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Approve Payout
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
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
