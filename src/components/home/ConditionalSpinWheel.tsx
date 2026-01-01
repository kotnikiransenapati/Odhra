import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SpinWheel } from '@/components/marketing/SpinWheel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Gift, ArrowRight, Lock, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConditionalSpinWheelProps {
  minOrderAmount?: number;
  showForNewUsers?: boolean;
}

export function ConditionalSpinWheel({ 
  minOrderAmount = 1499, 
  showForNewUsers = true 
}: ConditionalSpinWheelProps) {
  const { user } = useAuth();
  const [isEligible, setIsEligible] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkEligibility();
  }, [user]);

  const checkEligibility = async () => {
    setIsLoading(true);
    
    // New user (not logged in) - show as teaser
    if (!user) {
      setIsEligible(showForNewUsers);
      setIsLoading(false);
      return;
    }

    try {
      // Check if user has already used spin wheel
      const { data: promoUsage } = await supabase
        .from('promotion_usages')
        .select('id, promotions!inner(type)')
        .eq('user_id', user.id)
        .eq('promotions.type', 'spin_wheel')
        .limit(1);

      if (promoUsage && promoUsage.length > 0) {
        setHasSpun(true);
        setIsEligible(false);
        setIsLoading(false);
        return;
      }

      // Check total order amount
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('customer_id', user.id)
        .eq('payment_status', 'paid');

      const total = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      setTotalSpent(total);
      setIsEligible(total >= minOrderAmount || showForNewUsers);
    } catch (error) {
      console.error('Error checking spin eligibility:', error);
      setIsEligible(showForNewUsers);
    }
    
    setIsLoading(false);
  };

  // If user has already spun or loading, don't show
  if (isLoading) return null;
  if (hasSpun) return null;

  // If not eligible and not showing teaser, don't show
  if (!isEligible && !showForNewUsers) return null;

  const needsMoreSpending = user && totalSpent < minOrderAmount;
  const amountNeeded = minOrderAmount - totalSpent;

  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Gift className="w-4 h-4" />
              </motion.div>
              Spin & Win
            </motion.div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Try Your <span className="text-accent">Luck</span> Today!
            </h2>
            <p className="text-muted-foreground text-lg mb-6 max-w-md mx-auto lg:mx-0">
              Spin the wheel for a chance to win exclusive discounts, free shipping, and more! 
              Every spin is a winner.
            </p>

            {/* Conditional messaging */}
            {needsMoreSpending ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <Lock className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-600">Almost there!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Shop ₹{amountNeeded.toLocaleString()} more to unlock your free spin!
                </p>
                <Button className="mt-3 gap-2" asChild>
                  <Link to="/shop">
                    <ShoppingBag className="w-4 h-4" />
                    Continue Shopping
                  </Link>
                </Button>
              </div>
            ) : !user ? (
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 mb-6">
                <p className="text-sm text-muted-foreground mb-3">
                  Sign up now to get your first spin free! 🎉
                </p>
                <Button className="gap-2" asChild>
                  <Link to="/auth">
                    <Sparkles className="w-4 h-4" />
                    Sign Up & Spin
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="gap-2" asChild>
                  <Link to="/spin-to-win">
                    <Sparkles className="w-4 h-4" />
                    Full Wheel Experience
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            )}

            {/* Trust indicators */}
            <div className="mt-6 flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                {user ? 'You\'re eligible!' : 'No purchase required'}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Instant rewards
              </div>
            </div>
          </motion.div>

          {/* Wheel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Decorative ring */}
              <motion.div
                className="absolute -inset-4 rounded-full border-2 border-dashed border-accent/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              />
              
              {/* Lock overlay for ineligible users */}
              {needsMoreSpending && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
                  <div className="text-center">
                    <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <Badge variant="secondary">Locked</Badge>
                  </div>
                </div>
              )}
              
              <SpinWheel compact />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
