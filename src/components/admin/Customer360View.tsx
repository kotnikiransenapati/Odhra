import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingCart,
  CreditCard,
  Star,
  Heart,
  Gift,
  TrendingUp,
  Package,
  MessageSquare,
  Crown,
  Clock,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';

interface Customer360ViewProps {
  customerId: string;
  onClose?: () => void;
}

export function Customer360View({ customerId, onClose }: Customer360ViewProps) {
  // Fetch complete customer data
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer-360', customerId],
    queryFn: async () => {
      // Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', customerId)
        .single();

      // Orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*, sub_orders(*, order_items(*))')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      // Reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('*, products(title)')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      // Loyalty
      const { data: loyalty } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', customerId)
        .single();

      // Wishlist count
      const { count: wishlistCount } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', customerId);

      // Support tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Referrals
      const { data: referralCode } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', customerId)
        .single();

      // Calculate metrics
      const totalOrders = orders?.length || 0;
      const totalSpent = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrderDate = orders?.[0]?.created_at;
      
      // Recent activity (last 30 days)
      const recentOrders = orders?.filter(o => 
        new Date(o.created_at) > subDays(new Date(), 30)
      ).length || 0;

      // Calculate customer score (0-100)
      let customerScore = 0;
      if (totalOrders > 0) customerScore += 20;
      if (totalOrders > 5) customerScore += 20;
      if (totalSpent > 10000) customerScore += 20;
      if (totalSpent > 50000) customerScore += 20;
      if ((reviews?.length || 0) > 0) customerScore += 10;
      if (loyalty?.tier && loyalty.tier !== 'bronze') customerScore += 10;

      return {
        profile,
        orders: orders || [],
        reviews: reviews || [],
        loyalty,
        wishlistCount: wishlistCount || 0,
        tickets: tickets || [],
        referralCode,
        metrics: {
          totalOrders,
          totalSpent,
          avgOrderValue,
          lastOrderDate,
          recentOrders,
          customerScore,
        },
      };
    },
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'diamond': return 'bg-cyan-500';
      case 'platinum': return 'bg-purple-500';
      case 'gold': return 'bg-yellow-500';
      case 'silver': return 'bg-gray-400';
      default: return 'bg-orange-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!customer?.profile) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  const { profile, orders, reviews, loyalty, metrics, wishlistCount, tickets, referralCode } = customer;

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="flex items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-3xl font-bold">
          {(profile.full_name || profile.email)[0].toUpperCase()}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold">{profile.full_name || 'Unnamed Customer'}</h2>
            {metrics.totalSpent >= 50000 && (
              <Badge className="bg-warning">
                <Crown className="w-3 h-3 mr-1" />
                VIP
              </Badge>
            )}
            {loyalty?.tier && (
              <Badge className={getTierColor(loyalty.tier)}>
                {loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1)}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              {profile.email}
            </span>
            {profile.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {profile.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Customer since {format(new Date(profile.created_at), 'MMM yyyy')}
            </span>
          </div>
        </div>

        {/* Customer Score */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-accent flex items-center justify-center">
            <span className="text-2xl font-bold">{metrics.customerScore}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Health Score</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Spent', value: formatPrice(metrics.totalSpent), icon: CreditCard, color: 'text-green-500' },
          { label: 'Orders', value: metrics.totalOrders, icon: ShoppingCart, color: 'text-blue-500' },
          { label: 'Avg Order', value: formatPrice(metrics.avgOrderValue), icon: TrendingUp, color: 'text-purple-500' },
          { label: 'Reviews', value: reviews.length, icon: Star, color: 'text-yellow-500' },
          { label: 'Wishlist', value: wishlistCount, icon: Heart, color: 'text-red-500' },
          { label: 'Points', value: (loyalty?.points || 0).toLocaleString(), icon: Gift, color: 'text-accent' },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <p className="text-xl font-bold">{metric.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs for Detailed View */}
      <Tabs defaultValue="orders">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order History ({orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No orders yet</p>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">#{order.order_number}</span>
                            <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                          <span className="font-bold">{formatPrice(order.total_amount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{format(new Date(order.created_at), 'MMM dd, yyyy')}</span>
                          <span>{order.sub_orders?.reduce((sum: number, so: any) => 
                            sum + (so.order_items?.length || 0), 0)} items</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Reviews ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No reviews yet</p>
                  ) : (
                    reviews.map((review: any) => (
                      <div
                        key={review.id}
                        className="p-4 rounded-lg bg-secondary/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium truncate">{review.products?.title}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-warning fill-warning' : 'text-muted'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.title && <p className="font-medium text-sm">{review.title}</p>}
                        {review.content && (
                          <p className="text-sm text-muted-foreground mt-1">{review.content}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Last Order */}
                {metrics.lastOrderDate && (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                    <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-info" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Last Purchase</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(metrics.lastOrderDate), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Loyalty Activity */}
                {loyalty?.last_checkin_at && (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Last Check-in</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(loyalty.last_checkin_at), { addSuffix: true })}
                        {loyalty.streak_days && loyalty.streak_days > 1 && (
                          <span className="ml-2 text-accent">🔥 {loyalty.streak_days} day streak</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Referral Info */}
                {referralCode && (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Referral Code: {referralCode.code}</p>
                      <p className="text-sm text-muted-foreground">
                        {referralCode.successful_referrals || 0} successful referrals
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Support Tickets ({tickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {tickets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No support tickets</p>
                  ) : (
                    tickets.map((ticket: any) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-lg bg-secondary/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">#{ticket.ticket_number}</span>
                          <Badge variant={ticket.status === 'resolved' ? 'default' : 'secondary'}>
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
