import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReturns } from '@/hooks/useReturns';
import { useAuth } from '@/contexts/AuthContext';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, RotateCcw, Package, Clock, CheckCircle, XCircle, Truck, Search, X,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-warning/10 text-warning', icon: Clock },
  approved: { label: 'Approved', color: 'bg-success/10 text-success', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive', icon: XCircle },
  pickup_scheduled: { label: 'Pickup Scheduled', color: 'bg-info/10 text-info', icon: Truck },
  picked_up: { label: 'Picked Up', color: 'bg-info/10 text-info', icon: Truck },
  received: { label: 'Received', color: 'bg-accent/10 text-accent', icon: Package },
  inspected: { label: 'Inspected', color: 'bg-accent/10 text-accent', icon: Search },
  refunded: { label: 'Refunded', color: 'bg-success/10 text-success', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'pickup_scheduled', label: 'Pickup' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'closed', label: 'Closed' },
];

export default function Returns() {
  const { user } = useAuth();
  const { data: returns, isLoading, refetch, isFetching } = useReturns();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? 'all';

  const updateParam = (key: string, value: string) => {
    setSearchParams((p) => {
      if (!value || (key === 'status' && value === 'all')) p.delete(key);
      else p.set(key, value);
      return p;
    }, { replace: true });
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: returns?.length ?? 0 };
    returns?.forEach((r: any) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [returns]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (returns ?? []).filter((r: any) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchSearch = !needle ||
        r.return_number?.toLowerCase().includes(needle) ||
        r.return_reason?.toLowerCase().includes(needle);
      return matchStatus && matchSearch;
    });
  }, [returns, q, statusFilter]);

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="flex flex-col items-center justify-center h-[60vh] px-4">
          <RotateCcw className="w-16 h-16 text-muted-foreground mb-4" aria-hidden />
          <h1 className="text-xl font-semibold mb-2">Login required</h1>
          <p className="text-muted-foreground mb-6">Please log in to view your returns</p>
          <Button asChild><Link to="/auth">Login / Sign Up</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <a href="#returns-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent focus:text-accent-foreground focus:shadow-lg">Skip to main content</a>
      <Navbar />

      <main id="returns-main" tabIndex={-1} className="pt-24 pb-16 px-4 focus:outline-none" aria-labelledby="returns-heading">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Button variant="ghost" asChild className="mb-3 -ml-3" onClick={() => haptic('light')}>
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden /> Back to Account
              </Link>
            </Button>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h1 id="returns-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">My Returns</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {returns?.length ? `${returns.length} request${returns.length === 1 ? '' : 's'}` : 'Track refunds & pickups'}
                </p>
              </div>
              {!isLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { haptic('light'); refetch(); }}
                  disabled={isFetching}
                  className="text-muted-foreground"
                  aria-label="Refresh returns"
                >
                  {isFetching ? 'Refreshing…' : 'Refresh'}
                </Button>
              )}
            </div>
          </motion.div>

          {/* Search + filters */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="sticky top-[64px] z-20 -mx-4 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border/40 mb-4"
          >
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search by return # or reason…"
                value={q}
                onChange={(e) => updateParam('q', e.target.value)}
                className="pl-10 pr-9 h-10"
                aria-label="Search returns"
              />
              {q && (
                <button
                  onClick={() => { haptic('light'); updateParam('q', ''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              )}
            </div>
            <div
              className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none"
              role="tablist"
              aria-label="Filter by status"
            >
              {FILTERS.map((f) => {
                const active = statusFilter === f.value;
                const count = counts[f.value] || 0;
                return (
                  <button
                    key={f.value}
                    role="tab"
                    aria-selected={active}
                    onClick={() => { haptic('selection'); updateParam('status', f.value); }}
                    className={cn(
                      'shrink-0 snap-start inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium transition-all border',
                      active
                        ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                        : 'bg-background text-muted-foreground border-border/60 hover:text-foreground hover:border-border'
                    )}
                  >
                    {f.label}
                    {count > 0 && (
                      <span
                        className={cn(
                          'min-w-[18px] px-1 h-[18px] rounded-full text-[10px] font-semibold inline-flex items-center justify-center tabular-nums',
                          active ? 'bg-accent-foreground/20 text-accent-foreground' : 'bg-muted text-foreground'
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <p className="sr-only" aria-live="polite">{filtered.length} return{filtered.length === 1 ? '' : 's'} shown</p>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : filtered.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="space-y-4"
            >
              {filtered.map((ret: any) => {
                const config = statusConfig[ret.status] || statusConfig.pending;
                const Icon = config.icon;
                return (
                  <motion.div
                    key={ret.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } },
                    }}
                  >
                    <Card className="glass">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4 gap-3">
                          <div>
                            <p className="font-semibold">{ret.return_number}</p>
                            <p className="text-sm text-muted-foreground">
                              Created {format(new Date(ret.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <Badge className={config.color}>
                            <Icon className="w-3 h-3 mr-1" aria-hidden />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Reason: {ret.return_reason?.replace(/_/g, ' ')}
                          </span>
                          {ret.refund_amount && (
                            <span className="font-bold text-accent">{formatPrice(ret.refund_amount)}</span>
                          )}
                        </div>
                        {ret.rejected_reason && (
                          <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                            Rejected: {ret.rejected_reason}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <RotateCcw className="w-10 h-10 text-muted-foreground" aria-hidden />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {q || statusFilter !== 'all' ? 'No matching returns' : 'No returns yet'}
              </h2>
              <p className="text-muted-foreground mb-8">
                {q || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : "You haven't made any return requests"}
              </p>
              {(q || statusFilter !== 'all') ? (
                <Button variant="outline" onClick={() => { haptic('light'); setSearchParams({}, { replace: true }); }}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild><Link to="/orders">View Orders</Link></Button>
              )}
            </motion.div>
          )}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
