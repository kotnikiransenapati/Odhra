import React from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { haptic } from '@/lib/haptics';
import { RefreshCw, Package, ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSubscriptions } from '@/hooks/useSubscriptions';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { SubscriptionAnalyticsCard } from '@/components/subscription/SubscriptionAnalyticsCard';

export default function CustomerSubscriptions() {
  const { user } = useAuth();
  const { data: subscriptions = [], isLoading } = useUserSubscriptions();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'active';
  const handleTabChange = (v: string) => {
    haptic('light');
    const next = new URLSearchParams(searchParams);
    if (v === 'active') next.delete('tab'); else next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const pausedSubscriptions = subscriptions.filter(s => s.status === 'paused');
  const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled');

  const totalMonthlyValue = activeSubscriptions.reduce((acc, sub) => {
    const planPrice = sub.plan?.price || 0;
    const interval = sub.plan?.interval || 'monthly';
    const quantity = sub.quantity;
    
    // Normalize to monthly value
    let monthlyMultiplier = 1;
    switch (interval) {
      case 'weekly': monthlyMultiplier = 4; break;
      case 'biweekly': monthlyMultiplier = 2; break;
      case 'quarterly': monthlyMultiplier = 1/3; break;
      default: monthlyMultiplier = 1;
    }
    
    return acc + (planPrice * quantity * monthlyMultiplier);
  }, 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-24 px-4 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Login Required</h1>
          <p className="text-muted-foreground mb-6">Please login to view your subscriptions.</p>
          <Button asChild>
            <Link to="/auth">Login</Link>
          </Button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link to="/account">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Account
              </Link>
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <RefreshCw className="w-8 h-8 text-accent" />
                  My Subscriptions
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your recurring orders and deliveries
                </p>
              </div>

              <Button asChild>
                <Link to="/shop">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subscription
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Subscription Analytics */}
          <SubscriptionAnalyticsCard />

          {/* Summary Card */}
          {activeSubscriptions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-accent/10 via-primary/5 to-transparent border border-accent/20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                  <p className="text-3xl font-bold text-accent">{activeSubscriptions.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Est. Monthly Value</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(totalMonthlyValue)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && subscriptions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-accent" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Subscriptions Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Subscribe to your favorite products and never run out. 
                Get exclusive discounts and free shipping on all subscriptions!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                {[
                  { icon: Sparkles, text: 'Up to 15% off' },
                  { icon: Package, text: 'Free delivery' },
                  { icon: RefreshCw, text: 'Cancel anytime' },
                ].map((benefit) => (
                  <Badge key={benefit.text} variant="secondary" className="px-3 py-1.5">
                    <benefit.icon className="w-4 h-4 mr-1.5" />
                    {benefit.text}
                  </Badge>
                ))}
              </div>
              <Button asChild size="lg">
                <Link to="/shop">
                  Browse Products
                </Link>
              </Button>
            </motion.div>
          )}

          {/* Subscriptions List */}
          {!isLoading && subscriptions.length > 0 && (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active" className="gap-2">
                  Active
                  {activeSubscriptions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{activeSubscriptions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="paused" className="gap-2">
                  Paused
                  {pausedSubscriptions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{pausedSubscriptions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="gap-2">
                  Cancelled
                  {cancelledSubscriptions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{cancelledSubscriptions.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {activeSubscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active subscriptions
                  </div>
                ) : (
                  activeSubscriptions.map((subscription) => (
                    <SubscriptionCard key={subscription.id} subscription={subscription} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="paused" className="space-y-4">
                {pausedSubscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No paused subscriptions
                  </div>
                ) : (
                  pausedSubscriptions.map((subscription) => (
                    <SubscriptionCard key={subscription.id} subscription={subscription} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="cancelled" className="space-y-4">
                {cancelledSubscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No cancelled subscriptions
                  </div>
                ) : (
                  cancelledSubscriptions.map((subscription) => (
                    <SubscriptionCard key={subscription.id} subscription={subscription} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
