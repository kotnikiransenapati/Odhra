import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { Link } from 'react-router-dom';

interface CartReservationTimerProps {
  reservationMinutes?: number;
}

export function CartReservationTimer({ reservationMinutes = 15 }: CartReservationTimerProps) {
  const { items, itemCount } = useCart();
  const [timeLeft, setTimeLeft] = useState(reservationMinutes * 60);
  const [showWarning, setShowWarning] = useState(false);
  const [sessionStart] = useState(() => {
    // Get or set session start time
    const stored = sessionStorage.getItem('cart-session-start');
    if (stored) return parseInt(stored);
    const now = Date.now();
    sessionStorage.setItem('cart-session-start', now.toString());
    return now;
  });

  useEffect(() => {
    if (itemCount === 0) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      const remaining = Math.max(0, reservationMinutes * 60 - elapsed);
      setTimeLeft(remaining);

      // Show warning when less than 5 minutes left
      if (remaining < 300 && remaining > 0) {
        setShowWarning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStart, reservationMinutes, itemCount]);

  if (itemCount === 0 || timeLeft > 600) return null; // Don't show if more than 10 mins left

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLow = timeLeft < 300;
  const isExpired = timeLeft === 0;

  return (
    <AnimatePresence>
      {showWarning && !isExpired && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 right-4 z-50 max-w-sm"
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
                    {isLow ? 'Your cart is expiring soon!' : 'Cart reservation active'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {itemCount} items in your cart
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`font-mono text-2xl font-bold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                    <span className="text-sm text-muted-foreground">remaining</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowWarning(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <Button asChild className="w-full mt-3 gap-2" onClick={() => setShowWarning(false)}>
                <Link to="/checkout">
                  <ShoppingCart className="w-4 h-4" />
                  Complete Checkout
                </Link>
              </Button>
            </div>
            {/* Animated progress bar */}
            <motion.div
              initial={{ width: `${(timeLeft / (reservationMinutes * 60)) * 100}%` }}
              animate={{ width: '0%' }}
              transition={{ duration: timeLeft, ease: 'linear' }}
              className={`h-1 ${isLow ? 'bg-destructive' : 'bg-accent'}`}
            />
          </div>
        </motion.div>
      )}

      {isExpired && showWarning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="bg-card border border-border rounded-2xl shadow-xl max-w-md mx-4 p-6 text-center"
          >
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-xl font-bold mb-2">Cart Reservation Expired</h3>
            <p className="text-muted-foreground mb-4">
              Your cart items may no longer be reserved. Some items might have limited stock.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1" onClick={() => setShowWarning(false)}>
                <Link to="/shop">Continue Shopping</Link>
              </Button>
              <Button asChild className="flex-1" onClick={() => setShowWarning(false)}>
                <Link to="/cart">View Cart</Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
