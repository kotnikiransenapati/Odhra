import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Package,
  Calendar,
  Star,
  Repeat,
  Target,
  Award,
} from 'lucide-react';

const COLORS = ['hsl(var(--accent))', '#F97316', '#22C55E', '#EC4899', '#3B82F6', '#EAB308'];

export default function CustomerAnalytics() {
  const { user } = useAuth();

  // Fetch comprehensive analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['customer-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch all orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*, sub_orders(*, order_items(*))')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: true });

      // Fetch reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id);

      // Fetch wishlist
      const { data: wishlist } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id);

      // Calculate metrics
      const paidOrders = orders?.filter(o => ['paid', 'escrow'].includes(o.payment_status)) || [];
      const totalSpent = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);
      const avgOrderValue = paidOrders.length > 0 ? totalSpent / paidOrders.length : 0;

      // Monthly spending data (last 6 months)
      const monthlySpending = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        const monthOrders = paidOrders.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        monthlySpending.push({
          month: format(monthStart, 'MMM'),
          amount: monthOrders.reduce((sum, o) => sum + o.total_amount, 0),
          orders: monthOrders.length,
        });
      }

      // Category breakdown
      const categorySpending: Record<string, number> = {};
      orders?.forEach(order => {
        order.sub_orders?.forEach((subOrder: any) => {
          subOrder.order_items?.forEach((item: any) => {
            // We'd need category data, using vendor as proxy
            const key = subOrder.vendor_id?.slice(0, 8) || 'Other';
            categorySpending[key] = (categorySpending[key] || 0) + item.total_price;
          });
        });
      });

      // Order status breakdown
      const statusBreakdown = {
        pending: orders?.filter(o => o.status === 'pending').length || 0,
        processing: orders?.filter(o => ['confirmed', 'processing'].includes(o.status)).length || 0,
        shipped: orders?.filter(o => o.status === 'shipped').length || 0,
        delivered: orders?.filter(o => o.status === 'delivered').length || 0,
        cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
      };

      // Savings calculation
      const totalSavings = paidOrders.reduce((sum, o) => sum + (o.discount_amount || 0), 0);

      // Growth calculation (this month vs last month)
      const thisMonth = paidOrders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= startOfMonth(new Date());
      });
      const lastMonth = paidOrders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= startOfMonth(subMonths(new Date(), 1)) && orderDate < startOfMonth(new Date());
      });
      const thisMonthSpent = thisMonth.reduce((sum, o) => sum + o.total_amount, 0);
      const lastMonthSpent = lastMonth.reduce((sum, o) => sum + o.total_amount, 0);
      const spendingGrowth = lastMonthSpent > 0 ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100 : 0;

      return {
        totalSpent,
        avgOrderValue,
        totalOrders: orders?.length || 0,
        paidOrders: paidOrders.length,
        totalReviews: reviews?.length || 0,
        wishlistItems: wishlist?.length || 0,
        totalSavings,
        monthlySpending,
        statusBreakdown,
        spendingGrowth,
        thisMonthSpent,
        avgRating: reviews?.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
      };
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">Please login to view your analytics</p>
          <Button asChild>
            <Link to="/auth">Login / Sign Up</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24">
          <PageLoading text="Loading analytics..." />
        </div>
      </div>
    );
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statusData = Object.entries(analytics?.statusBreakdown || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count as number,
  })).filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Account
              </Link>
            </Button>
            <h1 className="text-display-sm md:text-display-md font-bold">My Analytics</h1>
            <p className="text-muted-foreground mt-1">Insights into your shopping patterns</p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { 
                label: 'Total Spent', 
                value: formatPrice(analytics?.totalSpent || 0), 
                icon: DollarSign, 
                color: 'text-success', 
                bg: 'bg-success/10',
                change: analytics?.spendingGrowth || 0,
              },
              { 
                label: 'Total Orders', 
                value: analytics?.paidOrders || 0, 
                icon: ShoppingBag, 
                color: 'text-info', 
                bg: 'bg-info/10' 
              },
              { 
                label: 'Avg Order Value', 
                value: formatPrice(analytics?.avgOrderValue || 0), 
                icon: Target, 
                color: 'text-accent', 
                bg: 'bg-accent/10' 
              },
              { 
                label: 'Total Saved', 
                value: formatPrice(analytics?.totalSavings || 0), 
                icon: Award, 
                color: 'text-warning', 
                bg: 'bg-warning/10' 
              },
            ].map((stat, i) => (
              <Card key={stat.label} className="glass">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    {stat.change !== undefined && stat.change !== 0 && (
                      <div className={`flex items-center gap-1 text-xs ${stat.change > 0 ? 'text-success' : 'text-destructive'}`}>
                        {stat.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(stat.change).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Spending Trend */}
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
                    Spending Trend (Last 6 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.monthlySpending && analytics.monthlySpending.some(m => m.amount > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={analytics.monthlySpending}>
                        <defs>
                          <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [formatPrice(value), 'Spent']}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="hsl(var(--accent))"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorSpending)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      <div className="text-center">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No spending data yet</p>
                        <Button asChild className="mt-4" size="sm">
                          <Link to="/shop">Start Shopping</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Order Status */}
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
                      <div className="mt-4 space-y-2">
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

          {/* Monthly Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Monthly Orders
                </CardTitle>
                <CardDescription>Number of orders placed each month</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.monthlySpending && analytics.monthlySpending.some(m => m.orders > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.monthlySpending}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No order data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Additional Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 grid md:grid-cols-3 gap-4"
          >
            <Card className="glass">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-warning" />
                </div>
                <p className="text-3xl font-bold">{analytics?.totalReviews || 0}</p>
                <p className="text-sm text-muted-foreground">Reviews Written</p>
                {analytics?.avgRating ? (
                  <Badge variant="secondary" className="mt-2">
                    Avg Rating: {analytics.avgRating.toFixed(1)} ⭐
                  </Badge>
                ) : null}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Repeat className="w-6 h-6 text-accent" />
                </div>
                <p className="text-3xl font-bold">{analytics?.wishlistItems || 0}</p>
                <p className="text-sm text-muted-foreground">Wishlist Items</p>
                <Button asChild variant="link" size="sm" className="mt-2">
                  <Link to="/wishlist">View Wishlist</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-accent" />
                </div>
                <p className="text-3xl font-bold">{formatPrice(analytics?.thisMonthSpent || 0)}</p>
                <p className="text-sm text-muted-foreground">Spent This Month</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
