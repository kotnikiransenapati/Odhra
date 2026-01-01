import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ExitIntentPopupProps {
  enabled?: boolean;
}

export function ExitIntentPopup({ enabled = true }: ExitIntentPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Check if already shown
    const hasShown = sessionStorage.getItem('exit-popup-shown');
    if (hasShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if cursor leaves from top of page
      if (e.clientY <= 0) {
        setIsOpen(true);
        sessionStorage.setItem('exit-popup-shown', 'true');
        // Remove listener after showing
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };

    // Add delay before enabling exit intent
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 10000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden mx-4">
              {/* Header with gradient */}
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
                  <ShoppingBag className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">Wait! Don't go yet!</h2>
                    <p className="text-accent-foreground/80 text-sm">We have something special for you</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 text-center">
                <h3 className="text-3xl font-bold mb-2">Get 20% OFF</h3>
                <p className="text-muted-foreground mb-6">
                  Your first order with code:
                </p>
                <div className="bg-secondary px-6 py-4 rounded-xl font-mono text-2xl font-bold mb-6">
                  STAYWITHUS20
                </div>
                <div className="space-y-3">
                  <Button asChild className="w-full gap-2">
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
