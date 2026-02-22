import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ArrowRight, Timer, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExitIntentPopupProps {
  enabled?: boolean;
}

export function ExitIntentPopup({ enabled = true }: ExitIntentPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(15 * 60); // 15 minute countdown

  // Fetch an active promo code from DB instead of hardcoding
  const { data: promoData } = useQuery({
    queryKey: ['exit-intent-promo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('promotions')
        .select('code, discount_type, discount_value, name')
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .order('discount_value', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data || { code: 'STAYWITHUS20', discount_type: 'percentage', discount_value: 20, name: 'Exit Intent Offer' };
    },
    staleTime: 60 * 60 * 1000,
  });

  const discountLabel = promoData?.discount_type === 'percentage' 
    ? `${promoData.discount_value}% OFF` 
    : `₹${promoData?.discount_value} OFF`;

  useEffect(() => {
    if (!enabled) return;

    const hasShown = sessionStorage.getItem('exit-popup-shown');
    if (hasShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setIsOpen(true);
        sessionStorage.setItem('exit-popup-shown', 'true');
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 10000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled]);

  // Countdown timer for urgency
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden mx-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-accent to-accent/80 p-6 text-accent-foreground">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-accent-foreground/80 hover:text-accent-foreground hover:bg-accent-foreground/10"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <Gift className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">Wait! Here's a gift 🎁</h2>
                    <p className="text-accent-foreground/80 text-sm">Exclusive offer just for you</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 text-center">
                <h3 className="text-3xl font-bold mb-2">Get {discountLabel}</h3>
                <p className="text-muted-foreground mb-4">
                  Use this code at checkout:
                </p>
                <div className="bg-secondary px-6 py-4 rounded-xl font-mono text-2xl font-bold mb-4 border-2 border-dashed border-accent/30">
                  {promoData?.code || 'STAYWITHUS20'}
                </div>
                
                {/* Urgency countdown */}
                <div className="flex items-center justify-center gap-2 mb-6 text-sm text-destructive font-medium">
                  <Timer className="w-4 h-4" />
                  <span>Expires in {minutes}:{seconds.toString().padStart(2, '0')}</span>
                </div>

                <div className="space-y-3">
                  <Button asChild className="w-full gap-2" size="lg">
                    <Link to="/shop">
                      Continue Shopping
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    No thanks, I'll pay full price
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
