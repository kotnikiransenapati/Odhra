import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Wallet,
  Gift,
  Ticket,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  Award,
  Target,
  ShoppingBag,
  Star,
  Zap,
  Crown,
} from 'lucide-react';

export default function CustomerWallet() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'active';
  const handleTabChange = (value: string) => {
    haptic('light');
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };
  const handleCopy = async (code: string) => {
    haptic('light');
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error('Could not copy code');
    }
  };


  // Fetch user's spin wheel entries (rewards)
  const { data: spinEntries, isLoading: spinLoading } = useQuery({
    queryKey: ['customer-spin-entries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('spin_wheel_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch user's promotion usages
  const { data: promoUsages, isLoading: promoLoading } = useQuery({
    queryKey: ['customer-promo-usages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('promotion_usages')
        .select('*, promotions(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch user's orders for loyalty points calculation
  const { data: orders } = useQuery({
    queryKey: ['customer-orders-stats', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, payment_status')
        .eq('customer_id', user.id)
        .in('payment_status', ['paid', 'escrow'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <Wallet className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">Please login to view your wallet</p>
          <Button asChild>
            <Link to="/auth">Login / Sign Up</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (spinLoading || promoLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24">
          <PageLoading text="Loading wallet..." />
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalSpent = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
  const loyaltyPoints = Math.floor(totalSpent / 10); // 1 point per ₹10 spent
  const tierProgress = (loyaltyPoints % 1000) / 10; // Progress to next tier
  const currentTier = loyaltyPoints >= 5000 ? 'Platinum' : loyaltyPoints >= 2000 ? 'Gold' : loyaltyPoints >= 500 ? 'Silver' : 'Bronze';
  const nextTier = currentTier === 'Bronze' ? 'Silver' : currentTier === 'Silver' ? 'Gold' : currentTier === 'Gold' ? 'Platinum' : null;
  const pointsToNextTier = currentTier === 'Bronze' ? 500 - loyaltyPoints : currentTier === 'Silver' ? 2000 - loyaltyPoints : currentTier === 'Gold' ? 5000 - loyaltyPoints : 0;

  const activeCoupons = spinEntries?.filter(e => e.status === 'active') || [];
  const usedCoupons = spinEntries?.filter(e => e.status === 'used') || [];
  const expiredCoupons = spinEntries?.filter(e => e.status === 'expired') || [];
  const totalSavings = [...usedCoupons, ...promoUsages].reduce((sum, item) => {
    if ('discount_applied' in item) return sum + item.discount_applied;
    return sum + (item.discount_value || 0);
  }, 0);

  const tierColors = {
    Bronze: 'from-accent/70 to-accent/90',
    Silver: 'from-muted-foreground/60 to-muted-foreground/80',
    Gold: 'from-accent to-accent/80',
    Platinum: 'from-primary to-primary/80',
  };

  const tierIcons = {
    Bronze: Award,
    Silver: Star,
    Gold: Crown,
    Platinum: Sparkles,
  };

  const TierIcon = tierIcons[currentTier as keyof typeof tierIcons];

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <a href="#wallet-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-md">
        Skip to main content
      </a>
      <Navbar />

      <main id="wallet-main" tabIndex={-1} className="pt-24 pb-16 px-4 outline-none" aria-labelledby="wallet-heading">
        <div className="max-w-4xl mx-auto">

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
            <h1 id="wallet-heading" className="text-display-sm md:text-display-md font-bold">My Wallet</h1>
            <p className="text-muted-foreground mt-1">Rewards, coupons & loyalty points</p>
          </motion.div>

          {/* Loyalty Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className={`overflow-hidden bg-gradient-to-br ${tierColors[currentTier as keyof typeof tierColors]} text-primary-foreground border-0`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TierIcon className="w-6 h-6" />
                      <span className="text-lg font-bold">{currentTier} Member</span>
                    </div>
                    <p className="text-primary-foreground/80 text-sm">Odhra Rewards Program</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{loyaltyPoints.toLocaleString()}</p>
                    <p className="text-primary-foreground/80 text-sm">Total Points</p>
                  </div>
                </div>

                {nextTier && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-foreground/80">Progress to {nextTier}</span>
                      <span className="font-medium">{pointsToNextTier} pts to go</span>
                    </div>
                    <Progress value={100 - (pointsToNextTier / (currentTier === 'Bronze' ? 500 : currentTier === 'Silver' ? 1500 : 3000) * 100)} className="h-2 bg-primary-foreground/20" />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-primary-foreground/20">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{orders?.length || 0}</p>
                     <p className="text-xs text-primary-foreground/80">Orders</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">₹{totalSavings.toLocaleString()}</p>
                    <p className="text-xs text-primary-foreground/80">Total Saved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{activeCoupons.length}</p>
                    <p className="text-xs text-primary-foreground/80">Active Coupons</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Active Coupons', value: activeCoupons.length, icon: Ticket, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Used Coupons', value: usedCoupons.length, icon: CheckCircle, color: 'text-info', bg: 'bg-info/10' },
              { label: 'Expired', value: expiredCoupons.length, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
              { label: 'Promos Used', value: promoUsages?.length || 0, icon: Gift, color: 'text-primary', bg: 'bg-primary/10' },
            ].map((stat, i) => (
              <Card key={stat.label} className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Coupons & Rewards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="active" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Active ({activeCoupons.length})
                </TabsTrigger>
                <TabsTrigger value="used" className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Used ({usedCoupons.length})
                </TabsTrigger>
                <TabsTrigger value="expired" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Expired ({expiredCoupons.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {activeCoupons.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeCoupons.map((coupon, i) => (
                      <motion.div
                        key={coupon.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card className="glass overflow-hidden border-accent/30">
                          <div className="bg-gradient-to-r from-accent/20 to-accent/5 px-4 py-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="default" className="bg-accent text-accent-foreground">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Spin & Win
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Expires {format(new Date(coupon.expires_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-2xl font-bold text-accent">
                                  {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                                </p>
                                <p className="text-sm text-muted-foreground">On your next order</p>
                              </div>
                              <Gift className="w-10 h-10 text-accent opacity-50" />
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-border">
                              <code className="text-sm font-mono bg-secondary px-3 py-1 rounded">{coupon.code}</code>
                              <Button size="sm" variant="outline" onClick={() => handleCopy(coupon.code)}>
                                Copy
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card className="glass">
                    <CardContent className="py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Ticket className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold mb-2">No Active Coupons</h3>
                      <p className="text-muted-foreground text-sm mb-4">Spin the wheel to win exclusive discounts!</p>
                      <Button asChild>
                        <Link to="/spin-to-win" className="gap-2">
                          <Sparkles className="w-4 h-4" /> Spin Now
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="used">
                {usedCoupons.length > 0 ? (
                  <div className="space-y-3">
                    {usedCoupons.map((coupon) => (
                      <Card key={coupon.id} className="glass opacity-75">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-success" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Used on {coupon.used_at ? format(new Date(coupon.used_at), 'MMM dd, yyyy') : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <code className="text-sm font-mono text-muted-foreground">{coupon.code}</code>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="glass">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No used coupons yet
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="expired">
                {expiredCoupons.length > 0 ? (
                  <div className="space-y-3">
                    {expiredCoupons.map((coupon) => (
                      <Card key={coupon.id} className="glass opacity-50">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                              <XCircle className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium line-through">
                                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Expired on {format(new Date(coupon.expires_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-destructive border-destructive/30">Expired</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="glass">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No expired coupons
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* How to Earn */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent" />
                  How to Earn Points
                </CardTitle>
                <CardDescription>Complete actions to earn loyalty points</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { icon: ShoppingBag, title: 'Shop', desc: 'Earn 1 point per ₹10 spent', points: '+10 pts/₹100' },
                    { icon: Star, title: 'Review', desc: 'Write product reviews', points: '+25 pts' },
                    { icon: Gift, title: 'Refer', desc: 'Invite friends to Odhra', points: '+100 pts' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                        <Badge variant="secondary" className="mt-2">{item.points}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
