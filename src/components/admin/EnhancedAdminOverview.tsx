import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminStats, useRevenueChart } from '@/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign, ShoppingCart, Store, Package, UserCheck, Wallet,
  TrendingUp, Loader2, Users, BarChart3, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle, Truck, Eye,
} from 'lucide-react';

function useEnhancedStats() {
  return useQuery({
    queryKey: ['admin-enhanced-stats'],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

      // Today's orders & revenue
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', today.toISOString())
        .in('payment_status', ['paid', 'escrow']);

      // Yesterday's orders for comparison
      const { data: yesterdayOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())
        .in('payment_status', ['paid', 'escrow']);

      // Pending orders
      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Processing orders
      const { count: processingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['confirmed', 'processing']);

      // Shipped orders
      const { count: shippedOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'shipped');

      // Active customers (ordered in last 30 days)
      const { count: activeCustomers } = await supabase
        .from('orders')
        .select('customer_id', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Low stock products
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 10)
        .gt('stock', 0)
        .eq('is_active', true);

      const todayRevenue = todayOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;
      const todayCount = todayOrders?.length || 0;
      const yesterdayRevenue = yesterdayOrders?.reduce((s, o) => s + o.total_amount, 0) || 0;
      const yesterdayCount = yesterdayOrders?.length || 0;

      const revenueChange = yesterdayRevenue > 0 
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
        : todayRevenue > 0 ? 100 : 0;
      const ordersChange = yesterdayCount > 0 
        ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 
        : todayCount > 0 ? 100 : 0;

      const aov = todayCount > 0 ? todayRevenue / todayCount : 0;

      return {
        todayRevenue, todayOrders: todayCount, aov,
        revenueChange, ordersChange,
        pendingOrders: pendingOrders || 0,
        processingOrders: processingOrders || 0,
        shippedOrders: shippedOrders || 0,
        activeCustomers: activeCustomers || 0,
        lowStockCount: lowStockCount || 0,
      };
    },
    refetchInterval: 30000,
  });
}

export function EnhancedAdminOverview() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: enhanced, isLoading: enhancedLoading } = useEnhancedStats();
  const { data: chartData, isLoading: chartLoading } = useRevenueChart();

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  if (statsLoading || enhancedLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const liveCards = [
    {
      label: "Today's Revenue",
      value: formatPrice(enhanced?.todayRevenue || 0),
      change: enhanced?.revenueChange || 0,
      icon: DollarSign,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: "Today's Orders",
      value: enhanced?.todayOrders || 0,
      change: enhanced?.ordersChange || 0,
      icon: ShoppingCart,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'Avg. Order Value',
      value: formatPrice(enhanced?.aov || 0),
      icon: BarChart3,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Active Customers',
      value: enhanced?.activeCustomers || 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  const overviewCards = [
    { label: 'Total Revenue', value: formatPrice(stats?.totalRevenue || 0), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Active Vendors', value: stats?.activeVendors || 0, icon: Store, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Products', value: stats?.totalProducts || 0, icon: Package, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Pending Vendors', value: stats?.pendingVendors || 0, icon: UserCheck, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Pending Payouts', value: stats?.pendingPayouts || 0, icon: Wallet, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  const orderPipeline = [
    { label: 'Pending', count: enhanced?.pendingOrders || 0, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Processing', count: enhanced?.processingOrders || 0, icon: Package, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Shipped', count: enhanced?.shippedOrders || 0, icon: Truck, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Low Stock', count: enhanced?.lowStockCount || 0, icon: Eye, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Live KPIs */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          Live Today
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {liveCards.map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="glass border-accent/10">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    {'change' in card && card.change !== undefined && (
                      <Badge variant="outline" className={`text-xs ${card.change >= 0 ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}`}>
                        {card.change >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {Math.abs(card.change).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Order Pipeline */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Order Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {orderPipeline.map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                  <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{item.count}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {overviewCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
            <Card className="glass">
              <CardContent className="pt-6">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Revenue (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12}
                    tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => [formatPrice(value), 'Revenue']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN')} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
