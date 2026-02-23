import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Package, Coins, SkipForward, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscriptionAnalytics } from '@/hooks/useSubscriptions';
import { Skeleton } from '@/components/ui/skeleton';

export function SubscriptionAnalyticsCard() {
  const { data: analytics, isLoading } = useSubscriptionAnalytics();

  if (isLoading) {
    return <Skeleton className="h-28 rounded-2xl" />;
  }

  if (!analytics || analytics.totalSubscriptions === 0) return null;

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);

  const stats = [
    { icon: CheckCircle, label: 'Active', value: analytics.activeCount, color: 'text-success' },
    { icon: Package, label: 'Deliveries', value: analytics.totalOrders, color: 'text-accent' },
    { icon: TrendingUp, label: 'Spent', value: formatPrice(analytics.totalSpent), color: 'text-primary' },
    { icon: Coins, label: 'Saved', value: formatPrice(analytics.totalSaved), color: 'text-warning' },
    { icon: SkipForward, label: 'Skipped', value: analytics.skippedOrders, color: 'text-muted-foreground' },
    { icon: AlertTriangle, label: 'Failed', value: analytics.failedOrders, color: 'text-destructive' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="bg-gradient-to-br from-accent/5 via-primary/5 to-transparent border-accent/10">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Subscription Insights
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
