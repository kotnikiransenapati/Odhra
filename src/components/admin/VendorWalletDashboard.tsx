import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { downloadCsv } from '@/lib/csvExport';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Coins,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
} from 'lucide-react';

interface WalletTxRow {
  id: string;
  vendor_id: string;
  amount: number;
  balance_after: number;
  type: string;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
  vendors: { brand_name: string; balance: number; pending_balance: number } | null;
}

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

export function VendorWalletDashboard() {
  const since = useMemo(() => subDays(new Date(), 90).toISOString(), []);

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['vendor-wallet-txs-90d'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(
          'id, vendor_id, amount, balance_after, type, description, reference_id, reference_type, created_at, vendors!inner(brand_name, balance, pending_balance)'
        )
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as WalletTxRow[];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendor-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, brand_name, balance, pending_balance, is_active')
        .eq('is_active', true)
        .order('balance', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const summary = useMemo(() => {
    const monthStart = startOfMonth(new Date()).getTime();
    let creditMtd = 0;
    let debitMtd = 0;
    let count = 0;
    txs.forEach((t) => {
      if (new Date(t.created_at).getTime() < monthStart) return;
      count++;
      if (Number(t.amount) >= 0) creditMtd += Number(t.amount);
      else debitMtd += Math.abs(Number(t.amount));
    });
    const totalFloat = vendors.reduce(
      (s, v) => s + Number(v.balance || 0) + Number(v.pending_balance || 0),
      0
    );
    return { creditMtd, debitMtd, count, totalFloat, net: creditMtd - debitMtd };
  }, [txs, vendors]);

  // 12-week trend (credits vs debits)
  const weekly = useMemo(() => {
    const buckets: { label: string; ts: number; credit: number; debit: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subDays(new Date(), i * 7);
      buckets.push({ label: format(d, 'MMM d'), ts: d.getTime(), credit: 0, debit: 0 });
    }
    txs.forEach((t) => {
      const ts = new Date(t.created_at).getTime();
      // find bucket: nearest week start
      const weeksAgo = Math.floor((Date.now() - ts) / (7 * 86400_000));
      const idx = 11 - weeksAgo;
      if (idx < 0 || idx > 11) return;
      const amt = Number(t.amount);
      if (amt >= 0) buckets[idx].credit += amt;
      else buckets[idx].debit += Math.abs(amt);
    });
    return buckets;
  }, [txs]);

  const peak = Math.max(1, ...weekly.map((b) => Math.max(b.credit, b.debit)));

  const handleExport = () => {
    downloadCsv('wallet_transactions', txs, [
      { key: 'created_at', label: 'Date' },
      { key: 'vendor', label: 'Vendor', accessor: (r) => r.vendors?.brand_name || r.vendor_id },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount (INR)' },
      { key: 'balance_after', label: 'Balance After' },
      { key: 'reference_type', label: 'Ref Type' },
      { key: 'description', label: 'Description' },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-accent" />
            Vendor Wallets
          </h2>
          <p className="text-sm text-muted-foreground">
            Float, credits, and 90-day transaction flow
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={txs.length === 0}>
          <Download className="w-4 h-4 mr-1" /> Export 90d CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-accent">
              <Coins className="w-4 h-4" /> Platform float
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(summary.totalFloat)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {vendors.length} active vendors
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-success">
              <TrendingUp className="w-4 h-4" /> Credits MTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(summary.creditMtd)}</div>
            <p className="text-xs text-muted-foreground mt-1">Earnings credited</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <TrendingDown className="w-4 h-4" /> Debits MTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(summary.debitMtd)}</div>
            <p className="text-xs text-muted-foreground mt-1">Payouts & adjustments</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" /> Net MTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${summary.net >= 0 ? 'text-success' : 'text-destructive'}`}
            >
              {formatINR(summary.net)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{summary.count} transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly trend chart */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Cash flow — last 12 weeks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {weekly.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full flex gap-0.5 items-end h-full">
                  <div
                    className="flex-1 rounded-t bg-success/70 transition-all group-hover:bg-success"
                    style={{ height: `${(b.credit / peak) * 100}%` }}
                  />
                  <div
                    className="flex-1 rounded-t bg-destructive/70 transition-all group-hover:bg-destructive"
                    style={{ height: `${(b.debit / peak) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{b.label}</span>
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover border border-border text-xs px-2 py-1 rounded shadow-md whitespace-nowrap z-10">
                  <div className="text-success">+{formatINR(b.credit)}</div>
                  <div className="text-destructive">−{formatINR(b.debit)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-success/70" /> Credits
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-destructive/70" /> Debits
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top vendors by balance */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Top wallets by balance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.brand_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatINR(Number(v.balance || 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatINR(Number(v.pending_balance || 0))}
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No active vendors
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Recent transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
            ) : txs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity</p>
            ) : (
              <ScrollArea className="h-72 pr-2">
                <ul className="space-y-2">
                  {txs.slice(0, 25).map((t) => {
                    const isCredit = Number(t.amount) >= 0;
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isCredit ? (
                            <ArrowDownLeft className="w-4 h-4 text-success shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-destructive shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {t.vendors?.brand_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {t.description || t.type} ·{' '}
                              {format(new Date(t.created_at), 'MMM d, HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div
                            className={`font-mono font-semibold text-sm ${isCredit ? 'text-success' : 'text-destructive'}`}
                          >
                            {isCredit ? '+' : '−'}
                            {formatINR(Math.abs(Number(t.amount)))}
                          </div>
                          <Badge variant="outline" className="text-[10px] mt-0.5">
                            {t.type}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
