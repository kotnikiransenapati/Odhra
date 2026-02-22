import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import {
  useAdvancedAnalytics,
  useRevenueByPeriod,
  useTopPerformers,
  useOrderStatusChart,
  useRecentActivity,
} from '@/hooks/useAdminAnalytics';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Wallet,
  Target,
  ShoppingBag,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChartIcon,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const COLORS = ['#8B5CF6', '#F97316', '#22C55E', '#EC4899', '#3B82F6', '#EAB308', '#06B6D4', '#EF4444'];

const STATUS_COLORS: Record<string, string> = {
  Pending: '#EAB308',
  Confirmed: '#3B82F6',
  Processing: '#8B5CF6',
  Shipped: '#06B6D4',
  Delivered: '#22C55E',
  Cancelled: '#EF4444',
  Refunded: '#F97316',
};

export function AdvancedAnalytics() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '365d'>('30d');
  
  const { data: stats, isLoading: statsLoading, refetch } = useAdvancedAnalytics(dateRange);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueByPeriod(dateRange);
  const { data: topPerformers, isLoading: performersLoading } = useTopPerformers();
  const { data: orderStatusData } = useOrderStatusChart();
  const { data: recentActivity } = useRecentActivity();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompact = (num: number) => {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num}`;
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: formatPrice(stats?.totalRevenue || 0),
      change: stats?.revenueGrowth || 0,
      icon: DollarSign,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Total Orders',
      value: stats?.totalOrders || 0,
      change: stats?.ordersGrowth || 0,
      icon: ShoppingCart,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'Avg Order Value',
      value: formatPrice(stats?.avgOrderValue || 0),
      change: stats?.avgOrderValueGrowth || 0,
      icon: Target,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Gross Profit',
      value: formatPrice(stats?.grossProfit || 0),
      change: 0,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'New Customers',
      value: stats?.newCustomers || 0,
      change: stats?.customersGrowth || 0,
      icon: Users,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'Commission Earned',
      value: formatPrice(stats?.totalCommission || 0),
      change: 0,
      icon: Wallet,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  const quickStats = [
    { label: 'Total Customers', value: stats?.totalCustomers || 0 },
    { label: 'Repeat Rate', value: `${(stats?.repeatCustomerRate || 0).toFixed(1)}%` },
    { label: 'Active Vendors', value: stats?.activeVendors || 0 },
    { label: 'Pending Vendors', value: stats?.pendingVendors || 0 },
    { label: 'Active Products', value: stats?.activeProducts || 0 },
    { label: 'Low Stock', value: stats?.lowStockProducts || 0 },
    { label: 'Out of Stock', value: stats?.outOfStockProducts || 0 },
    { label: 'Pending Payouts', value: stats?.pendingPayouts || 0 },
  ];

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
      {/* Header with Date Range & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-muted-foreground">Real-time business intelligence dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-secondary rounded-lg p-1">
            {(['7d', '30d', '90d', '365d'] as const).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(range)}
                className="px-3"
              >
                {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '90d' ? '90D' : '1Y'}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  {kpi.change !== 0 && (
                    <Badge variant={kpi.change > 0 ? 'default' : 'destructive'} className="text-[10px]">
                      {kpi.change > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                      {Math.abs(kpi.change).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-bold truncate">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats Bar */}
      <Card className="glass">
        <CardContent className="py-4">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {quickStats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Orders Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                Revenue & Orders Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickFormatter={(value) => format(new Date(value), 'd MMM')}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickFormatter={(value) => formatCompact(value)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'orders' ? value : formatPrice(value),
                        name.charAt(0).toUpperCase() + name.slice(1)
                      ]}
                      labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenueGrad)"
                      name="revenue"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={false}
                      name="orders"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-accent" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {orderStatusData?.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {orderStatusData?.filter(s => s.count > 0).slice(0, 6).map((status, i) => (
                  <div key={status.status} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: STATUS_COLORS[status.status] || COLORS[i] }} 
                    />
                    <span className="truncate">{status.status}</span>
                    <span className="ml-auto font-medium">{status.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Conversion & Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
              <Target className="w-4 h-4 text-accent" />
            </div>
            <p className="text-3xl font-bold">{(stats?.conversionRate || 0).toFixed(1)}%</p>
            <Progress value={stats?.conversionRate || 0} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">Cart to Order</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Cart Abandonment</span>
              <ShoppingBag className="w-4 h-4 text-warning" />
            </div>
            <p className="text-3xl font-bold">{(stats?.cartAbandonmentRate || 0).toFixed(1)}%</p>
            <Progress value={stats?.cartAbandonmentRate || 0} className="mt-3 [&>div]:bg-warning" />
            <p className="text-xs text-muted-foreground mt-2">Carts not converted</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Repeat Customers</span>
              <Users className="w-4 h-4 text-success" />
            </div>
            <p className="text-3xl font-bold">{(stats?.repeatCustomerRate || 0).toFixed(1)}%</p>
            <Progress value={stats?.repeatCustomerRate || 0} className="mt-3 [&>div]:bg-success" />
            <p className="text-xs text-muted-foreground mt-2">Returning buyers</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Pending Payouts</span>
              <Wallet className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-3xl font-bold">{formatCompact(stats?.totalPayoutAmount || 0)}</p>
            <p className="text-xs text-muted-foreground mt-2">{stats?.pendingPayouts || 0} requests waiting</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Top Performers */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products">
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-6">
              {performersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {topPerformers?.topProducts.map((product, i) => (
                    <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.title}</p>
                        <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                      </div>
                      <span className="font-bold">{formatPrice(product.revenue)}</span>
                    </div>
                  ))}
                  {(!topPerformers?.topProducts || topPerformers.topProducts.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No data available</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="vendors" className="mt-6">
              <div className="space-y-3">
                {topPerformers?.topVendors.map((vendor, i) => (
                  <div key={vendor.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                    <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">{vendor.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(vendor.revenue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(vendor.commission)} commission
                      </p>
                    </div>
                  </div>
                ))}
                {(!topPerformers?.topVendors || topPerformers.topVendors.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="customers" className="mt-6">
              <div className="space-y-3">
                {topPerformers?.topCustomers.map((customer, i) => (
                  <div key={customer.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                    <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {(customer.name || customer.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(customer.spending)}</p>
                      <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                    </div>
                  </div>
                ))}
                {(!topPerformers?.topCustomers || topPerformers.topCustomers.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="categories" className="mt-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topPerformers?.categoryBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    fontSize={11}
                    tickFormatter={(value) => formatCompact(value)}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    fontSize={11} 
                    width={100}
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatPrice(value), 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recentActivity?.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);
              return (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
            {(!recentActivity || recentActivity.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
