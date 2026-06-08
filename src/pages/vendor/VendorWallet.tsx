import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { haptic } from '@/lib/haptics';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Building,
  Loader2,
  AlertTriangle,
  Receipt,
  PiggyBank,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

export default function VendorWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');

  // Fetch vendor data
  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor-wallet-data', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch wallet transactions
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['vendor-transactions', vendor?.id],
    queryFn: async () => {
      if (!vendor) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendor?.id,
  });

  // Fetch payout requests
  const { data: payouts } = useQuery({
    queryKey: ['vendor-payouts', vendor?.id],
    queryFn: async () => {
      if (!vendor) return [];
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendor?.id,
  });

  // Calculate stats
  const totalEarnings = transactions?.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalCommission = transactions?.filter(t => t.type === 'commission').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
  const totalPayouts = transactions?.filter(t => t.type === 'payout').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
  const pendingPayouts = payouts?.filter(p => p.status === 'pending').length || 0;

  // Create payout request
  const createPayout = useMutation({
    mutationFn: async () => {
      if (!vendor) throw new Error('Vendor not found');
      const amount = parseFloat(payoutAmount);
      if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');
      if (amount > vendor.balance) throw new Error('Insufficient balance');

      const { error } = await supabase.from('payout_requests').insert({
        vendor_id: vendor.id,
        amount,
        payment_method: payoutMethod,
        bank_details: vendor.bank_details,
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payout request submitted');
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      setShowPayoutDialog(false);
      setPayoutAmount('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit payout request');
    },
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'commission': return <Receipt className="w-4 h-4 text-warning" />;
      case 'payout': return <ArrowUpRight className="w-4 h-4 text-info" />;
      case 'refund': return <ArrowDownRight className="w-4 h-4 text-destructive" />;
      default: return <DollarSign className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning';
      case 'approved': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      case 'completed': return 'bg-info/10 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (vendorLoading || txLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <AlertTriangle className="w-16 h-16 text-warning mb-4" />
        <h2 className="text-xl font-semibold mb-2">Vendor Account Required</h2>
        <p className="text-muted-foreground mb-6">You need to be a registered vendor</p>
        <Button asChild>
          <Link to="/become-vendor">Become a Seller</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/vendor"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="font-bold text-lg">Vendor Wallet</h1>
              <p className="text-xs text-muted-foreground">Manage your earnings & payouts</p>
            </div>
          </div>
          <Button onClick={() => setShowPayoutDialog(true)} disabled={vendor.balance <= 0} className="gap-2">
            <Banknote className="w-4 h-4" />
            Request Payout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass border-accent/30">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-success" />
                  </div>
                  <Badge variant="outline" className="text-success border-success/30">Available</Badge>
                </div>
                <p className="text-3xl font-bold text-success">{formatPrice(vendor.balance)}</p>
                <p className="text-sm text-muted-foreground">Available Balance</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <Badge variant="outline" className="text-warning border-warning/30">Pending</Badge>
                </div>
                <p className="text-3xl font-bold">{formatPrice(vendor.pending_balance)}</p>
                <p className="text-sm text-muted-foreground">Pending Balance</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-accent" />
                  </div>
                </div>
                <p className="text-3xl font-bold">{formatPrice(totalEarnings)}</p>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                    <PiggyBank className="w-6 h-6 text-info" />
                  </div>
                </div>
                <p className="text-3xl font-bold">{formatPrice(totalPayouts)}</p>
                <p className="text-sm text-muted-foreground">Total Withdrawn</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Transactions & Payouts */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="transactions" className="gap-2">
              <Receipt className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-2">
              <Banknote className="w-4 h-4" />
              Payouts ({pendingPayouts} pending)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Your wallet transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions && transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((tx, i) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-secondary/30"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'sale' ? 'bg-success/10' :
                            tx.type === 'commission' ? 'bg-warning/10' :
                            tx.type === 'payout' ? 'bg-info/10' :
                            'bg-destructive/10'
                          }`}>
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.description || format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {tx.amount >= 0 ? '+' : ''}{formatPrice(tx.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bal: {formatPrice(tx.balance_after)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                    <p className="text-sm mt-2">Start selling to see your earnings here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  Payout History
                </CardTitle>
                <CardDescription>Your withdrawal requests and status</CardDescription>
              </CardHeader>
              <CardContent>
                {payouts && payouts.length > 0 ? (
                  <div className="space-y-3">
                    {payouts.map((payout, i) => (
                      <motion.div
                        key={payout.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-secondary/30"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getPayoutStatusColor(payout.status)}`}>
                            {payout.status === 'pending' ? <Clock className="w-5 h-5" /> :
                             payout.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                             payout.status === 'rejected' ? <XCircle className="w-5 h-5" /> :
                             <RefreshCw className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{formatPrice(payout.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {payout.payment_method.replace('_', ' ')} • {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getPayoutStatusColor(payout.status)}>
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </Badge>
                          {payout.admin_note && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                              {payout.admin_note}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Banknote className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payout requests yet</p>
                    <Button onClick={() => setShowPayoutDialog(true)} disabled={vendor.balance <= 0} className="mt-4">
                      Request Your First Payout
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bank Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Bank Details
              </CardTitle>
              <CardDescription>Your payout account information</CardDescription>
            </CardHeader>
            <CardContent>
              {vendor.bank_details ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Account Holder</p>
                    <p className="font-medium">{(vendor.bank_details as any).account_name || 'Not set'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{(vendor.bank_details as any).bank_name || 'Not set'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-medium font-mono">
                      {'•'.repeat(8)}{(vendor.bank_details as any).account_number?.slice(-4) || '****'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">IFSC Code</p>
                    <p className="font-medium font-mono">{(vendor.bank_details as any).ifsc_code || 'Not set'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">No bank details configured</p>
                  <Button asChild variant="outline">
                    <Link to="/vendor/settings">Add Bank Details</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Payout Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Withdraw your available balance to your bank account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-success">{formatPrice(vendor?.balance || 0)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Payout Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                max={vendor?.balance || 0}
              />
              <Button
                type="button"
                variant="link"
                size="sm"
                className="p-0 h-auto"
                onClick={() => setPayoutAmount(vendor?.balance?.toString() || '0')}
              >
                Withdraw Full Amount
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createPayout.mutate()}
              disabled={createPayout.isPending || !payoutAmount || parseFloat(payoutAmount) <= 0}
            >
              {createPayout.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
