import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ArrowRight, Timer, Gift, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';

interface ExitIntentPopupProps {
  enabled?: boolean;
}

export function ExitIntentPopup({ enabled = true }: ExitIntentPopupProps) {
  const { isEnabled: exitPopupEnabled } = useFeatureFlag('exit_intent_popup');
  const { isEnabled: exitIntentEnabled, settings: exitIntentSettings } = useFeatureFlag('exit_intent_cart_recovery');
  const { isEnabled: dynamicDiscountEnabled } = useFeatureFlag('dynamic_discount_escalation');
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(15 * 60);
  const { user } = useAuth();
  const { items } = useCart();
  const hasCartItems = items.length > 0;
  const cartValue = items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Get dynamic discount for this user's cart value
  const { data: dynamicDiscount } = useQuery({
    queryKey: ['exit-intent-discount', user?.id, cartValue],
    queryFn: async () => {
      if (!user || !hasCartItems) return null;
      const { data } = await supabase.rpc('get_cart_recovery_discount', {
        p_user_id: user.id,
        p_cart_value: cartValue,
        p_email_step: 1,
      });
      return data as { discount_type: string; discount_value: number; discount_code: string; user_segment: string } | null;
    },
    enabled: !!user && hasCartItems && dynamicDiscountEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // Fallback to a general promo if no dynamic discount
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
    enabled: !dynamicDiscount || dynamicDiscount.discount_type === 'none',
  });

  const activeDiscount = dynamicDiscount && dynamicDiscount.discount_type !== 'none'
    ? { code: dynamicDiscount.discount_code, discount_type: dynamicDiscount.discount_type, discount_value: dynamicDiscount.discount_value }
    : promoData;

  const discountLabel = activeDiscount?.discount_type === 'percentage'
    ? `${activeDiscount.discount_value}% OFF`
    : `₹${activeDiscount?.discount_value} OFF`;

  const trackExitPopup = useCallback(async (converted: boolean) => {
    if (!user) return;
    try {
      // Mark exit popup shown/converted on existing abandonment event
      const { data: existing } = await supabase
        .from('cart_abandonment_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('recovered', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existing?.[0]) {
        await supabase
          .from('cart_abandonment_events')
          .update({
            exit_popup_shown: true,
            exit_popup_converted: converted,
            ...(converted ? {
              recovery_channel: 'exit_popup',
              recovery_discount_code: activeDiscount?.code,
              recovery_discount_value: activeDiscount?.discount_value,
            } : {}),
          } as any)
          .eq('id', existing[0].id);
      }
    } catch { /* silent */ }
  }, [user, activeDiscount]);

  useEffect(() => {
    if (!enabled || !exitPopupEnabled || !exitIntentEnabled) return;
    const minCartValue = exitIntentSettings?.min_cart_value || 0;
    if (cartValue < minCartValue) return;
    const hasShown = sessionStorage.getItem('exit-popup-shown');
    if (hasShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setIsOpen(true);
        sessionStorage.setItem('exit-popup-shown', 'true');
        document.removeEventListener('mouseleave', handleMouseLeave);
        trackExitPopup(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 10000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, exitIntentEnabled, exitIntentSettings, cartValue, trackExitPopup]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 0 ? (clearInterval(timer), 0) : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const handleCTA = () => {
    if (activeDiscount?.code) {
      // Copy code to clipboard for easy use
      navigator.clipboard?.writeText(activeDiscount.code).catch(() => {});
      toast.success(`Code ${activeDiscount.code} copied! Applied at checkout.`);
    }
    trackExitPopup(true);
    setIsOpen(false);
  };

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg z-50 max-h-[90dvh]"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-[90dvh] overflow-y-auto overscroll-contain">
              {/* Header */}
              <div className="bg-gradient-to-r from-accent to-accent/80 p-4 sm:p-6 text-accent-foreground relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-accent-foreground/80 hover:text-accent-foreground hover:bg-accent-foreground/10"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  {hasCartItems ? <ShoppingBag className="w-8 h-8" /> : <Gift className="w-8 h-8" />}
                  <div>
                    <h2 className="text-xl font-bold">
                      {hasCartItems ? 'Your cart is waiting! 🛒' : 'Wait! Here\'s a gift 🎁'}
                    </h2>
                    <p className="text-accent-foreground/80 text-sm">
                      {hasCartItems
                        ? `${items.length} item${items.length > 1 ? 's' : ''} worth ₹${cartValue.toLocaleString('en-IN')}`
                        : 'Exclusive offer just for you'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cart items preview (if user has items) */}
              {hasCartItems && items.length > 0 && (
                <div className="px-6 pt-4 flex gap-2 overflow-x-auto">
                  {items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex-shrink-0 w-16 h-16 rounded-lg bg-secondary overflow-hidden border border-border">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-secondary flex items-center justify-center border border-border">
                      <span className="text-sm font-medium text-muted-foreground">+{items.length - 3}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-4 sm:p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-accent shrink-0" />
                  <h3 className="text-2xl sm:text-3xl font-bold">Get {discountLabel}</h3>
                  <Sparkles className="w-5 h-5 text-accent shrink-0" />
                </div>
                {dynamicDiscount?.user_segment === 'high_value' && (
                  <p className="text-xs text-accent font-medium mb-2">✨ VIP exclusive offer</p>
                )}
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">Use this code at checkout:</p>
                <div className="bg-secondary px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-mono text-lg sm:text-2xl font-bold mb-4 border-2 border-dashed border-accent/30 break-all">
                  {activeDiscount?.code || 'STAYWITHUS20'}
                </div>

                <div className="flex items-center justify-center gap-2 mb-6 text-sm text-destructive font-medium">
                  <Timer className="w-4 h-4" />
                  <span>Expires in {minutes}:{seconds.toString().padStart(2, '0')}</span>
                </div>

                <div className="space-y-3">
                  <Button asChild className="w-full gap-2" size="lg" onClick={handleCTA}>
                    <Link to={hasCartItems ? '/cart' : '/shop'}>
                      {hasCartItems ? 'Complete Your Purchase' : 'Continue Shopping'}
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
