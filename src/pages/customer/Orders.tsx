import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderCard } from '@/components/orders/OrderCard';
import { useOrders, type Order } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Search,
  Package,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Orders() {
  const { user } = useAuth();
  const { data: orders, isLoading, error, refetch, isFetching } = useOrders();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? 'all';

  const updateParam = (key: string, value: string) => {
    setSearchParams(
      (p) => {
        if (!value || (key === 'status' && value === 'all')) p.delete(key);
        else p.set(key, value);
        return p;
      },
      { replace: true }
    );
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders?.length ?? 0 };
    orders?.forEach((o) => {
      c[o.status] = (c[o.status] || 0) + 1;
    });
    return c;
  }, [orders]);

  const filteredOrders: Order[] | undefined = orders?.filter((order) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      order.order_number.toLowerCase().includes(q) ||
      order.sub_orders.some((so) =>
        so.items.some((item) => item.product_title.toLowerCase().includes(q))
      );
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4" aria-hidden />
          <h2 className="text-xl font-semibold mb-2">Login required</h2>
          <p className="text-muted-foreground mb-6">Please log in to view your orders</p>
          <Button asChild><Link to="/auth">Login / Sign Up</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <Navbar />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" asChild className="mb-3 -ml-3" onClick={() => haptic('light')}>
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden /> Back to Account
              </Link>
            </Button>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Orders</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {orders?.length ? `${orders.length} order${orders.length === 1 ? '' : 's'} so far` : 'Track, return, or buy again'}
                </p>
              </div>
              {!isLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { haptic('light'); refetch(); }}
                  disabled={isFetching}
                  className="text-muted-foreground"
                  aria-label="Refresh orders"
                >
                  {isFetching ? 'Refreshing…' : 'Refresh'}
                </Button>
              )}
            </div>
          </motion.div>

          {/* Search + sticky filter rail */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="sticky top-[64px] z-20 -mx-4 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border/40 mb-4"
          >
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search by order # or product…"
                value={searchQuery}
                onChange={(e) => updateParam('q', e.target.value)}
                className="pl-10 pr-9 h-10"
                aria-label="Search orders"
              />
              {searchQuery && (
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
              {STATUS_FILTERS.map((f) => {
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

          {/* List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border/40 p-4 space-y-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-20 bg-muted rounded-full" />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded-lg" />
                    <div className="w-16 h-16 bg-muted rounded-lg" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-20 bg-muted rounded" />
                    <div className="h-9 w-28 bg-muted rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-destructive" aria-hidden />
              </div>
              <h2 className="text-xl font-semibold mb-2">Failed to load orders</h2>
              <p className="text-muted-foreground mb-4">{(error as Error)?.message || 'Something went wrong'}</p>
              <Button onClick={() => refetch()}>Try again</Button>
            </motion.div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="space-y-4"
            >
              {filteredOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } },
                  }}
                >
                  <OrderCard order={order} index={index} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-muted-foreground" aria-hidden />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No matching orders' : 'No orders yet'}
              </h2>
              <p className="text-muted-foreground mb-8">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : "When you place orders, they'll appear here"}
              </p>
              {(searchQuery || statusFilter !== 'all') ? (
                <Button
                  variant="outline"
                  onClick={() => { haptic('light'); setSearchParams({}, { replace: true }); }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button asChild><Link to="/shop">Start shopping</Link></Button>
              )}
            </motion.div>
          )}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
