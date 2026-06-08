import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SystemHealthWidget } from '@/components/admin/SystemHealthWidget';
import { WebVitalsDashboard } from '@/components/admin/WebVitalsDashboard';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdvancedAnalytics, useRevenueByPeriod, useRecentActivity } from '@/hooks/useAdminAnalytics';
import { haptic } from '@/lib/haptics';
import {
  DollarSign,
  ShoppingCart,
  Store,
  Package,
  Users,
  Wallet,
  TrendingUp,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
  Activity,
  Zap,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type OverviewRange = '7d' | '30d' | '90d' | '365d';

const OVERVIEW_RANGES: Array<{ label: string; value: OverviewRange }> = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '365d' },
];

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export function EnhancedOverview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const requestedRange = searchParams.get('ov_range') as OverviewRange | null;
  const range: OverviewRange = OVERVIEW_RANGES.some(option => option.value === requestedRange) ? requestedRange! : '30d';
  const { data: stats, isLoading: statsLoading } = useAdvancedAnalytics(range);
  const { data: chartData, isLoading: chartLoading } = useRevenueByPeriod(range);
  const { data: recentActivity } = useRecentActivity();
  const chartRows = chartData || [];
  const motionTransition = shouldReduceMotion ? { duration: 0 } : springTransition;

  const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    color: 'hsl(var(--popover-foreground))',
    boxShadow: 'var(--shadow-lg)',
  };

  const navigateToTab = (tab: string) => {
    haptic('light');
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const setRange = (nextRange: OverviewRange) => {
    haptic('light');
    const next = new URLSearchParams(searchParams);
    next.set('ov_range', nextRange);
    setSearchParams(next);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (statsLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading admin overview">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[380px] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[380px] rounded-xl" />
        </div>
        <span className="sr-only">Loading overview metrics</span>
      </div>
    );
  }

  const primaryStats = [
    {
      label: 'Total Revenue',
      value: formatPrice(stats?.totalRevenue || 0),
      change: stats?.revenueGrowth || 0,
      icon: DollarSign,
      color: 'text-success',
      bg: 'bg-success/10',
      tab: 'analytics',
    },
    {
      label: 'Total Orders',
      value: stats?.totalOrders || 0,
      change: stats?.ordersGrowth || 0,
      icon: ShoppingCart,
      color: 'text-info',
      bg: 'bg-info/10',
      tab: 'orders',
    },
    {
      label: 'Active Vendors',
      value: stats?.activeVendors || 0,
      change: 0,
      icon: Store,
      color: 'text-primary',
      bg: 'bg-primary/10',
      tab: 'vendors',
    },
    {
      label: 'Total Products',
      value: stats?.totalProducts || 0,
      change: 0,
      icon: Package,
      color: 'text-accent',
      bg: 'bg-accent/10',
      tab: 'products',
    },
    {
      label: 'Total Customers',
      value: stats?.totalCustomers || 0,
      change: stats?.customersGrowth || 0,
      icon: Users,
      color: 'text-info',
      bg: 'bg-info/10',
      tab: 'customers',
    },
    {
      label: 'Gross Profit',
      value: formatPrice(stats?.grossProfit || 0),
      change: 0,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
      tab: 'analytics',
    },
  ];

  const alerts = [
    {
      type: 'warning',
      label: 'Pending Vendors',
      value: stats?.pendingVendors || 0,
      tab: 'vendors',
      show: (stats?.pendingVendors || 0) > 0,
    },
    {
      type: 'warning',
      label: 'Pending Payouts',
      value: stats?.pendingPayouts || 0,
      tab: 'payouts',
      show: (stats?.pendingPayouts || 0) > 0,
    },
    {
      type: 'danger',
      label: 'Low Stock Products',
      value: stats?.lowStockProducts || 0,
      tab: 'products',
      show: (stats?.lowStockProducts || 0) > 0,
    },
    {
      type: 'danger',
      label: 'Out of Stock',
      value: stats?.outOfStockProducts || 0,
      tab: 'products',
      show: (stats?.outOfStockProducts || 0) > 0,
    },
  ].filter(a => a.show);

  const orderStatusData = [
    { name: 'Pending', value: stats?.pendingOrders || 0, color: 'hsl(var(--warning))' },
    { name: 'Processing', value: stats?.processingOrders || 0, color: 'hsl(var(--info))' },
    { name: 'Shipped', value: stats?.shippedOrders || 0, color: CHART_COLORS[3] },
    { name: 'Delivered', value: stats?.deliveredOrders || 0, color: 'hsl(var(--success))' },
    { name: 'Cancelled', value: stats?.cancelledOrders || 0, color: 'hsl(var(--destructive))' },
  ].filter(s => s.value > 0);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return ShoppingCart;
      case 'review': return Activity;
      case 'vendor': return Store;
      case 'payout': return Wallet;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'order': return 'text-info bg-info/10';
      case 'review': return 'text-warning bg-warning/10';
      case 'vendor': return 'text-accent bg-accent/10';
      case 'payout': return 'text-warning bg-warning/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Executive overview</h2>
          <p className="text-sm text-muted-foreground">Revenue, operations, and risk signals for the selected period.</p>
        </div>
        <div className="inline-flex w-full rounded-lg border border-border bg-secondary/40 p-1 sm:w-auto" role="group" aria-label="Overview date range">
          {OVERVIEW_RANGES.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={range === option.value ? 'default' : 'ghost'}
              className="min-h-9 flex-1 px-3 text-xs sm:flex-none"
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        Showing admin overview for {range}.
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionTransition}
        >
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                </div>
                <span className="font-semibold text-sm">Action Required</span>
                <div className="flex flex-wrap gap-2">
                  {alerts.map((alert, i) => (
                    <Badge 
                      key={i}
                      variant={alert.type === 'danger' ? 'destructive' : 'default'}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigateToTab(alert.tab)}
                    >
                      {alert.value} {alert.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {primaryStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { ...springTransition, delay: i * 0.04 }}
          >
            <Card 
              role="button"
              tabIndex={0}
              aria-label={`Open ${stat.label}`}
              className="h-full min-h-[132px] hover:shadow-md transition-all cursor-pointer hover:border-accent/30 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => stat.tab && navigateToTab(stat.tab)}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && stat.tab) {
                  event.preventDefault();
                  navigateToTab(stat.tab);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                  </div>
                  {stat.change !== 0 && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${stat.change > 0 ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}`}>
                      {stat.change > 0 ? <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                      {Math.abs(stat.change).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-lg font-bold truncate">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { ...springTransition, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="glass h-full">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  Revenue Intelligence
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Revenue, commission, and profit trajectory.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigateToTab('analytics')}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="flex items-center justify-center h-[280px]">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : chartRows.every(row => row.revenue === 0 && row.commission === 0 && row.profit === 0) ? (
                <div className="flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
                  <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">No paid revenue in this range</p>
                  <p className="text-sm text-muted-foreground">Switch ranges or open analytics for deeper diagnostics.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartRows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenueOverview" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCommissionOverview" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProfitOverview" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickFormatter={(value) => format(new Date(value), 'd MMM')}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '4 4' }}
                      formatter={(value: number, name: string) => [formatPrice(value), name.charAt(0).toUpperCase() + name.slice(1)]}
                      labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenueOverview)"
                      activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="commission"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={1.8}
                      fillOpacity={1}
                      fill="url(#colorCommissionOverview)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="hsl(var(--chart-4))"
                      strokeWidth={1.8}
                      fillOpacity={1}
                      fill="url(#colorProfitOverview)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {[
                  ['Revenue', 'bg-chart-2'],
                  ['Commission', 'bg-chart-3'],
                  ['Profit', 'bg-chart-4'],
                ].map(([label, dot]) => (
                  <span key={label} className="inline-flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                    {label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { ...springTransition, delay: 0.4 }}
        >
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-accent" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderStatusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={orderStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {orderStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipContentStyle} formatter={(value: number) => [value, 'Orders']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {orderStatusData.map((status, i) => (
                      <div key={status.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                          <span>{status.name}</span>
                        </div>
                        <span className="font-medium">{status.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No orders yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Quick Metrics + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { ...springTransition, delay: 0.5 }}
        >
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle>Quick Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Conversion Rate</span>
                  <span className="font-medium">{(stats?.conversionRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={clampPercent(stats?.conversionRate || 0)} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Repeat Customer Rate</span>
                  <span className="font-medium">{(stats?.repeatCustomerRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={clampPercent(stats?.repeatCustomerRate || 0)} className="h-2 [&>div]:bg-success" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Cart Abandonment</span>
                  <span className="font-medium">{(stats?.cartAbandonmentRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={clampPercent(stats?.cartAbandonmentRate || 0)} className="h-2 [&>div]:bg-warning" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center p-3 rounded-lg bg-secondary/30">
                  <p className="text-2xl font-bold">{formatPrice(stats?.avgOrderValue || 0)}</p>
                  <p className="text-xs text-muted-foreground">Avg Order Value</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/30">
                  <p className="text-2xl font-bold">{formatPrice(stats?.totalCommission || 0)}</p>
                  <p className="text-xs text-muted-foreground">Commission Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { ...springTransition, delay: 0.6 }}
        >
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {recentActivity?.slice(0, 8).map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  const colorClass = getActivityColor(activity.type);
                  return (
                    <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
                {(!recentActivity || recentActivity.length === 0) && (
                  <div className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
                    <Activity className="mx-auto mb-2 h-7 w-7 opacity-60" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* System Monitoring Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={shouldReduceMotion ? { duration: 0 } : { ...springTransition, delay: 0.7 }}>
          <SystemHealthWidget />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={shouldReduceMotion ? { duration: 0 } : { ...springTransition, delay: 0.75 }}>
          <WebVitalsDashboard />
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { ...springTransition, delay: 0.8 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'View Orders', icon: ShoppingCart, tab: 'orders' },
                { label: 'Manage Products', icon: Package, tab: 'products' },
                { label: 'View Customers', icon: Users, tab: 'customers' },
                { label: 'Full Analytics', icon: TrendingUp, tab: 'analytics' },
              ].map((action) => (
                <Button
                  key={action.tab}
                  variant="outline"
                  className="min-h-24 py-4 flex-col gap-2 hover:border-accent/40 hover:bg-accent/5"
                  onClick={() => navigateToTab(action.tab)}
                >
                  <action.icon className="w-5 h-5 text-accent" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
