import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
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
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Star,
  Users,
  Eye,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Percent,
} from 'lucide-react';

const COLORS = ['hsl(var(--accent))', '#F97316', '#22C55E', '#EC4899', '#3B82F6', '#EAB308'];

export default function VendorAnalytics() {
  const { user } = useAuth();

  // Fetch vendor
  const { data: vendor } = useQuery({
    queryKey: ['vendor-for-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch comprehensive analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['vendor-analytics', vendor?.id],
    queryFn: async () => {
      if (!vendor) return null;

      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);

      // Fetch sub-orders
      const { data: subOrders } = await supabase
        .from('sub_orders')
        .select('*, order_items(*)')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: true });

      const currentPeriod = subOrders?.filter(so => new Date(so.created_at) >= thirtyDaysAgo) || [];
      const prevPeriod = subOrders?.filter(so => new Date(so.created_at) >= sixtyDaysAgo && new Date(so.created_at) < thirtyDaysAgo) || [];

      // Revenue calculations
      const currentRevenue = currentPeriod.reduce((sum, so) => sum + so.total_amount, 0);
      const prevRevenue = prevPeriod.reduce((sum, so) => sum + so.total_amount, 0);
      const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Order calculations
      const totalOrders = subOrders?.length || 0;
      const currentOrders = currentPeriod.length;
      const prevOrders = prevPeriod.length;
      const ordersGrowth = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : 0;

      // Daily revenue for chart
      const dailyRevenue: Record<string, { revenue: number; orders: number; commission: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyRevenue[date] = { revenue: 0, orders: 0, commission: 0 };
      }

      currentPeriod.forEach(so => {
        const date = format(new Date(so.created_at), 'yyyy-MM-dd');
        if (dailyRevenue[date]) {
          dailyRevenue[date].revenue += so.total_amount;
          dailyRevenue[date].orders += 1;
          dailyRevenue[date].commission += so.commission_amount || 0;
        }
      });

      const revenueChart = Object.entries(dailyRevenue).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
        earnings: data.revenue - data.commission,
      }));

      // Order status breakdown
      const statusBreakdown = {
        pending: subOrders?.filter(so => so.status === 'pending').length || 0,
        processing: subOrders?.filter(so => ['confirmed', 'processing'].includes(so.status)).length || 0,
        shipped: subOrders?.filter(so => so.status === 'shipped').length || 0,
        delivered: subOrders?.filter(so => so.status === 'delivered').length || 0,
        cancelled: subOrders?.filter(so => so.status === 'cancelled').length || 0,
      };

      // Products performance
      const { data: products } = await supabase
        .from('products')
        .select('id, title, sold_count, view_count, avg_rating, stock')
        .eq('vendor_id', vendor.id);

      const totalProducts = products?.length || 0;
      const totalViews = products?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
      const avgRating = products?.length ? products.reduce((sum, p) => sum + (p.avg_rating || 0), 0) / products.length : 0;

      // Top products
      const topProducts = [...(products || [])]
        .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
        .slice(0, 5);

      // Reviews stats
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating, created_at')
        .in('product_id', products?.map(p => p.id) || []);

      const totalReviews = reviews?.length || 0;
      const recentReviews = reviews?.filter(r => new Date(r.created_at) >= thirtyDaysAgo).length || 0;

      // Rating distribution
      const ratingDist = [1, 2, 3, 4, 5].map(rating => ({
        rating: `${rating}★`,
        count: reviews?.filter(r => r.rating === rating).length || 0,
      }));

      // Conversion rate (orders / views)
      const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;

      // Commission stats
      const totalCommission = subOrders?.reduce((sum, so) => sum + (so.commission_amount || 0), 0) || 0;
      const totalEarnings = subOrders?.reduce((sum, so) => sum + (so.vendor_earnings || 0), 0) || 0;

      return {
        currentRevenue,
        revenueGrowth,
        currentOrders,
        ordersGrowth,
        totalOrders,
        revenueChart,
        statusBreakdown,
        totalProducts,
        totalViews,
        avgRating,
        topProducts,
        totalReviews,
        recentReviews,
        ratingDist,
        conversionRate,
        totalCommission,
        totalEarnings,
        commissionRate: vendor.commission_rate,
      };
    },
    enabled: !!vendor?.id,
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const statusData = Object.entries(analytics?.statusBreakdown || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count as number,
  })).filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="font-bold text-lg">Analytics</h1>
            <p className="text-xs text-muted-foreground">Store performance insights</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { 
              label: 'Revenue (30d)', 
              value: formatPrice(analytics?.currentRevenue || 0), 
              icon: DollarSign, 
              color: 'text-green-500', 
              bg: 'bg-green-500/10',
              change: analytics?.revenueGrowth || 0,
            },
            { 
              label: 'Orders (30d)', 
              value: analytics?.currentOrders || 0, 
              icon: ShoppingCart, 
              color: 'text-blue-500', 
              bg: 'bg-blue-500/10',
              change: analytics?.ordersGrowth || 0,
            },
            { 
              label: 'Products', 
              value: analytics?.totalProducts || 0, 
              icon: Package, 
              color: 'text-purple-500', 
              bg: 'bg-purple-500/10',
            },
            { 
              label: 'Avg Rating', 
              value: (analytics?.avgRating || 0).toFixed(1), 
              icon: Star, 
              color: 'text-yellow-500', 
              bg: 'bg-yellow-500/10',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    {stat.change !== undefined && stat.change !== 0 && (
                      <div className={`flex items-center gap-1 text-xs ${stat.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(stat.change).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Revenue Chart & Order Status */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
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
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={analytics?.revenueChart || []}>
                    <defs>
                      <linearGradient id="vendorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      tickFormatter={(v) => format(new Date(v), 'dd')}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatPrice(value), 'Revenue']}
                      labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#vendorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-accent" />
                  Order Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-4">
                      {statusData.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">{item.value}</span>
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

        {/* Financial & Performance Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{formatPrice(analytics?.totalEarnings || 0)}</p>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <Percent className="w-6 h-6 text-orange-500" />
              </div>
              <p className="text-2xl font-bold">{analytics?.commissionRate || 0}%</p>
              <p className="text-sm text-muted-foreground">Commission Rate</p>
              <p className="text-xs text-muted-foreground mt-1">
                Paid: {formatPrice(analytics?.totalCommission || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Eye className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{(analytics?.totalViews || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Product Views</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-2xl font-bold">{(analytics?.conversionRate || 0).toFixed(2)}%</p>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Products & Reviews */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-accent" />
                  Top Selling Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.topProducts && analytics.topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topProducts.map((product, i) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold">
                            {i + 1}
                          </div>
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">{product.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.view_count || 0} views • {(product.avg_rating || 0).toFixed(1)}★
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{product.sold_count || 0} sold</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No products yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent" />
                  Rating Distribution
                </CardTitle>
                <CardDescription>
                  {analytics?.totalReviews || 0} total reviews ({analytics?.recentReviews || 0} this month)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.ratingDist && analytics.ratingDist.some(r => r.count > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.ratingDist} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="rating" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No reviews yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
