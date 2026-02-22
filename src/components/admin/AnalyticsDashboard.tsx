import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
} from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--info))', 'hsl(var(--warning))'];

export function AnalyticsDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Current period
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .in('payment_status', ['paid', 'escrow']);

      // Previous period
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString())
        .in('payment_status', ['paid', 'escrow']);

      const currentRevenue = currentOrders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
      const prevRevenue = prevOrders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
      const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Customers
      const { count: currentCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: prevCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      const customersChange = (prevCustomers || 0) > 0 
        ? (((currentCustomers || 0) - (prevCustomers || 0)) / (prevCustomers || 1)) * 100 
        : 0;

      return {
        revenue: currentRevenue,
        revenueChange,
        orders: currentOrders?.length || 0,
        ordersChange: prevOrders && prevOrders.length > 0 
          ? (((currentOrders?.length || 0) - prevOrders.length) / prevOrders.length) * 100 
          : 0,
        customers: currentCustomers || 0,
        customersChange,
        avgOrderValue: currentOrders && currentOrders.length > 0 
          ? currentRevenue / currentOrders.length 
          : 0,
      };
    },
  });

  const { data: revenueChart, isLoading: chartLoading } = useQuery({
    queryKey: ['analytics-revenue-chart'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .in('payment_status', ['paid', 'escrow']);

      const dailyRevenue: Record<string, number> = {};
      orders?.forEach((order) => {
        const date = order.created_at.split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + order.total_amount;
      });

      const result = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          revenue: dailyRevenue[dateStr] || 0,
        });
      }

      return result;
    },
  });

  const { data: categoryData } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: async () => {
      const { data: products } = await supabase
        .from('products')
        .select('category_id, sold_count');

      const { data: categories } = await supabase
        .from('categories')
        .select('id, name');

      const categorySales: Record<string, number> = {};
      products?.forEach((product) => {
        if (product.category_id) {
          categorySales[product.category_id] = (categorySales[product.category_id] || 0) + (product.sold_count || 0);
        }
      });

      return categories?.map((cat) => ({
        name: cat.name,
        value: categorySales[cat.id] || 0,
      })).filter(c => c.value > 0).slice(0, 6) || [];
    },
  });

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

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatPrice(stats?.revenue || 0),
      change: stats?.revenueChange || 0,
      icon: DollarSign,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Orders',
      value: stats?.orders || 0,
      change: stats?.ordersChange || 0,
      icon: ShoppingCart,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'New Customers',
      value: stats?.customers || 0,
      change: stats?.customersChange || 0,
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Avg Order Value',
      value: formatPrice(stats?.avgOrderValue || 0),
      change: 0,
      icon: Package,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  {stat.change !== 0 && (
                    <div className={`flex items-center gap-1 text-sm ${stat.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.change > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(stat.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Revenue Trend (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueChart}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatPrice(value), 'Revenue']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN')}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-accent" />
                Sales by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData && categoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {categoryData.slice(0, 4).map((cat, i) => (
                      <div key={cat.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          <span className="truncate max-w-[120px]">{cat.name}</span>
                        </div>
                        <span className="font-medium">{cat.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
