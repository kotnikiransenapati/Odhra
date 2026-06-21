import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { Link } from 'react-router-dom';

interface CartReservationTimerProps {
  reservationMinutes?: number;
}

const DISMISS_KEY = 'cart-reservation-dismissed-until';
const EXPIRED_KEY = 'cart-reservation-expired-shown';
const SESSION_KEY = 'cart-session-start';
// Once dismissed, suppress for the rest of this cart session (until cart empties / session resets)
const DISMISS_TTL_MS = 30 * 60 * 1000;

export function CartReservationTimer({ reservationMinutes = 15 }: CartReservationTimerProps) {
  const { isEnabled, settings } = useFeatureFlag('cart_reservation_timer');
  const effectiveMinutes = (settings as any)?.reservation_minutes ?? reservationMinutes;
  const { itemCount } = useCart();

  const [sessionStart] = useState(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return parseInt(stored);
    const now = Date.now();
    sessionStorage.setItem(SESSION_KEY, now.toString());
    return now;
  });

  const [now, setNow] = useState(() => Date.now());
  const [dismissedUntil, setDismissedUntil] = useState<number>(() => {
    const v = sessionStorage.getItem(DISMISS_KEY);
    return v ? parseInt(v) : 0;
  });
  const [expiredAcked, setExpiredAcked] = useState<boolean>(() => {
    return sessionStorage.getItem(EXPIRED_KEY) === '1';
  });

  // Reset everything when the cart empties
  useEffect(() => {
    if (itemCount === 0) {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(DISMISS_KEY);
      sessionStorage.removeItem(EXPIRED_KEY);
      setDismissedUntil(0);
      setExpiredAcked(false);
    }
  }, [itemCount]);

  useEffect(() => {
    if (!isEnabled || itemCount === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isEnabled, itemCount]);

  const elapsed = Math.floor((now - sessionStart) / 1000);
  const timeLeft = Math.max(0, effectiveMinutes * 60 - elapsed);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLow = timeLeft > 0 && timeLeft < 300;
  const isExpired = timeLeft === 0;
  const isDismissed = now < dismissedUntil;

  const dismiss = useCallback(() => {
    const until = Date.now() + DISMISS_TTL_MS;
    sessionStorage.setItem(DISMISS_KEY, until.toString());
    setDismissedUntil(until);
  }, []);

  const ackExpired = useCallback(() => {
    sessionStorage.setItem(EXPIRED_KEY, '1');
    setExpiredAcked(true);
    dismiss();
  }, [dismiss]);

  if (!isEnabled || itemCount === 0) return null;

  // Hide entirely if user dismissed, or while plenty of time remains (>10m)
  const shouldShowWarning = !isDismissed && !isExpired && timeLeft <= 600;
  const shouldShowExpiredBanner = isExpired && !expiredAcked && !isDismissed;

  return (
    <AnimatePresence>
      {shouldShowWarning && (
        <motion.div
          key="warning"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 right-4 z-50 max-w-sm"
          role="status"
          aria-live="polite"
        >
          <div className={`rounded-xl shadow-lg border overflow-hidden ${
            isLow ? 'bg-destructive/10 border-destructive/30' : 'bg-card border-border'
          }`}>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isLow ? 'bg-destructive/20' : 'bg-warning/10'
                }`}>
                  {isLow ? (
                    <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
                  ) : (
                    <Clock className="w-5 h-5 text-warning" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${isLow ? 'text-destructive' : ''}`}>
                    {isLow ? 'Your cart is expiring soon' : 'Cart reservation active'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {itemCount} item{itemCount === 1 ? '' : 's'} reserved
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`font-mono text-2xl font-bold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                    <span className="text-sm text-muted-foreground">remaining</span>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  aria-label="Dismiss cart reservation reminder"
                  className="text-muted-foreground hover:text-foreground p-1 -m-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Button asChild className="w-full mt-3 gap-2" onClick={dismiss}>
                <Link to="/checkout">
                  <ShoppingCart className="w-4 h-4" />
                  Complete Checkout
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {shouldShowExpiredBanner && (
        <motion.div
          key="expired"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 right-4 z-50 max-w-sm"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-xl shadow-lg border border-border bg-card overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Reservation ended</p>
                  <p className="text-sm text-muted-foreground">
                    Your items are still in your cart — stock will be reconfirmed at checkout.
                  </p>
                </div>
                <button
                  onClick={ackExpired}
                  aria-label="Dismiss reservation expired notice"
                  className="text-muted-foreground hover:text-foreground p-1 -m-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="flex-1" onClick={ackExpired} asChild>
                  <Link to="/shop">Keep shopping</Link>
                </Button>
                <Button size="sm" className="flex-1" onClick={ackExpired} asChild>
                  <Link to="/cart">View cart</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
