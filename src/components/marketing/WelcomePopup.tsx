import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Mail, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { usePopupSlot, POPUP_PRIORITY } from '@/lib/popupQueue';




interface WelcomePopupProps {
  delay?: number;
  discountCode?: string;
  discountPercentage?: number;
}

export function WelcomePopup({ 
  delay = 3000, 
  discountCode = 'WELCOME15', 
  discountPercentage = 15 
}: WelcomePopupProps) {
  const { isEnabled, settings } = useFeatureFlag('welcome_popup');
  const [wantsToShow, setWantsToShow] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Allow admin to override discount via flag settings
  const effectiveDiscountCode = (settings as any)?.discount_code || discountCode;
  const effectiveDiscountPct = (settings as any)?.discount_percentage ?? discountPercentage;
  const effectiveDelay = (settings as any)?.delay_ms ?? delay;

  useEffect(() => {
    if (!isEnabled) return;
    // Check if already shown to this visitor
    const hasShown = localStorage.getItem('welcome-popup-shown');
    if (hasShown) return;

    // Wait for cookie consent to be resolved before requesting the popup slot
    const checkAndShow = () => {
      const cookieConsent = localStorage.getItem('cookie_consent');
      if (cookieConsent) {
        const timer = setTimeout(() => {
          setWantsToShow(true);
          localStorage.setItem('welcome-popup-shown', 'true');
        }, effectiveDelay);
        return () => clearTimeout(timer);
      }
      const pollTimer = setTimeout(checkAndShow, 2000);
      return () => clearTimeout(pollTimer);
    };

    const cleanup = checkAndShow();
    return () => { if (cleanup) cleanup(); };
  }, [effectiveDelay, isEnabled]);

  // Coordinate with other site popups so only one shows at a time.
  const canShow = usePopupSlot('welcome', POPUP_PRIORITY.WELCOME, wantsToShow);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await supabase.from('email_preferences').upsert({
        user_id: crypto.randomUUID(),
        newsletter: true,
        promotional_emails: true,
        order_updates: false,
        shipping_updates: false,
        review_reminders: false,
        product_recommendations: true,
        abandoned_cart_reminders: true,
      }, { onConflict: 'user_id' });
    } catch {
      // Silently continue even if DB save fails
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Welcome! Your discount code has been applied!');

    // Auto close after showing success
    setTimeout(() => setWantsToShow(false), 3000);
  };

  const handleClose = () => {
    setWantsToShow(false);
  };

  return (
    <AnimatePresence>
      {canShow && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Centering wrapper — flex centers the popup reliably on every viewport,
              avoiding the previous top-1/2 + translate trick that clipped the
              popup on short screens. */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md max-h-[90dvh] pointer-events-auto"
            >

            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] overflow-y-auto overscroll-contain">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground"
                onClick={handleClose}
                aria-label="Close welcome popup"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </Button>

              {/* Decorative header */}
              <div className="relative bg-gradient-to-br from-accent via-accent/90 to-primary p-6 sm:p-8 text-accent-foreground overflow-hidden">
                {/* Floating particles */}
                <motion.div
                  animate={{ 
                    y: [-5, 5, -5],
                    rotate: [0, 10, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute top-4 right-16"
                >
                  <Sparkles className="w-6 h-6 text-accent-foreground/40" />
                </motion.div>
                <motion.div
                  animate={{ 
                    y: [5, -5, 5],
                    rotate: [0, -10, 0]
                  }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute bottom-4 left-8"
                >
                  <Sparkles className="w-4 h-4 text-accent-foreground/30" />
                </motion.div>

                <div className="relative text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-accent-foreground/20 mb-3 sm:mb-4"
                  >
                    <Gift className="w-6 h-6 sm:w-8 sm:h-8" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl sm:text-2xl font-bold mb-1"
                  >
                    Welcome to Odhra!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-accent-foreground/80 text-sm"
                  >
                    Get exclusive deals on premium products
                  </motion.p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                {!isSubmitted ? (
                  <>
                    <div className="text-center mb-4 sm:mb-6">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                          {effectiveDiscountPct}% OFF
                        </span>
                        <p className="text-muted-foreground mt-1.5 sm:mt-2 text-sm sm:text-base">
                          Your first purchase
                        </p>
                      </motion.div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
                          disabled={isSubmitting}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold gap-2"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                          />
                        ) : (
                          <>
                            Get My Discount
                            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </>
                        )}
                      </Button>
                    </form>

                    <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-3 sm:mt-4 leading-relaxed">
                      By subscribing, you agree to receive marketing emails. 
                      Unsubscribe anytime.
                    </p>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-2 sm:py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-success/10 text-success mb-3 sm:mb-4"
                    >
                      <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                    </motion.div>
                    <h3 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2">You're In!</h3>
                    <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                      Use code at checkout:
                    </p>
                    <div className="bg-secondary px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-mono text-lg sm:text-xl font-bold">
                      {effectiveDiscountCode}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
