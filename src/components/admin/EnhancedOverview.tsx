import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
import { useAdvancedAnalytics, useRevenueByPeriod, useRecentActivity } from '@/hooks/useAdminAnalytics';
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
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const COLORS = ['#8B5CF6', '#F97316', '#22C55E', '#EC4899', '#3B82F6', '#EAB308'];

export function EnhancedOverview() {
  const { data: stats, isLoading: statsLoading } = useAdvancedAnalytics('30d');
  const { data: chartData, isLoading: chartLoading } = useRevenueByPeriod('30d');
  const { data: recentActivity } = useRecentActivity();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const primaryStats = [
    {
      label: 'Total Revenue',
      value: formatPrice(stats?.totalRevenue || 0),
      change: stats?.revenueGrowth || 0,
      icon: DollarSign,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Total Orders',
      value: stats?.totalOrders || 0,
      change: stats?.ordersGrowth || 0,
      icon: ShoppingCart,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Active Vendors',
      value: stats?.activeVendors || 0,
      change: 0,
      icon: Store,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Total Products',
      value: stats?.totalProducts || 0,
      change: 0,
      icon: Package,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Total Customers',
      value: stats?.totalCustomers || 0,
      change: stats?.customersGrowth || 0,
      icon: Users,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Gross Profit',
      value: formatPrice(stats?.grossProfit || 0),
      change: 0,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ];

  const alerts = [
    {
      type: 'warning',
      label: 'Pending Vendors',
      value: stats?.pendingVendors || 0,
      link: '?tab=vendors',
      show: (stats?.pendingVendors || 0) > 0,
    },
    {
      type: 'warning',
      label: 'Pending Payouts',
      value: stats?.pendingPayouts || 0,
      link: '?tab=payouts',
      show: (stats?.pendingPayouts || 0) > 0,
    },
    {
      type: 'danger',
      label: 'Low Stock Products',
      value: stats?.lowStockProducts || 0,
      link: '?tab=products',
      show: (stats?.lowStockProducts || 0) > 0,
    },
    {
      type: 'danger',
      label: 'Out of Stock',
      value: stats?.outOfStockProducts || 0,
      link: '?tab=products',
      show: (stats?.outOfStockProducts || 0) > 0,
    },
  ].filter(a => a.show);

  const orderStatusData = [
    { name: 'Pending', value: stats?.pendingOrders || 0, color: '#EAB308' },
    { name: 'Processing', value: stats?.processingOrders || 0, color: '#3B82F6' },
    { name: 'Shipped', value: stats?.shippedOrders || 0, color: '#06B6D4' },
    { name: 'Delivered', value: stats?.deliveredOrders || 0, color: '#22C55E' },
    { name: 'Cancelled', value: stats?.cancelledOrders || 0, color: '#EF4444' },
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
      case 'order': return 'text-blue-500 bg-blue-500/10';
      case 'review': return 'text-yellow-500 bg-yellow-500/10';
      case 'vendor': return 'text-purple-500 bg-purple-500/10';
      case 'payout': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Action Required:</span>
                {alerts.map((alert, i) => (
                  <Link key={i} to={alert.link}>
                    <Badge 
                      variant={alert.type === 'danger' ? 'destructive' : 'default'}
                      className="cursor-pointer hover:opacity-80"
                    >
                      {alert.value} {alert.label}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {primaryStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {stat.change !== 0 && (
                    <div className={`flex items-center gap-1 text-xs ${stat.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(stat.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-xl font-bold truncate">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
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
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="glass h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Revenue (Last 30 Days)
              </CardTitle>
              <Link to="?tab=analytics">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="flex items-center justify-center h-[280px]">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenueOverview" x1="0" y1="0" x2="0" y2="1">
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
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatPrice(value), 'Revenue']}
                      labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenueOverview)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
                      <Tooltip />
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
          transition={{ delay: 0.5 }}
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
                <Progress value={stats?.conversionRate || 0} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Repeat Customer Rate</span>
                  <span className="font-medium">{(stats?.repeatCustomerRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={stats?.repeatCustomerRate || 0} className="h-2 [&>div]:bg-green-500" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Cart Abandonment</span>
                  <span className="font-medium">{(stats?.cartAbandonmentRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={stats?.cartAbandonmentRate || 0} className="h-2 [&>div]:bg-orange-500" />
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
          transition={{ delay: 0.6 }}
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
                  <p className="text-center text-muted-foreground py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
