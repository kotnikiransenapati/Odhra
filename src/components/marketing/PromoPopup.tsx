import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Percent, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SpinWheel } from './SpinWheel';
import { toast } from 'sonner';

type PopupType = 'discount' | 'newsletter' | 'spinwheel';

interface PromoPopupProps {
  type?: PopupType;
  delay?: number; // Delay in ms before showing popup
  showOnce?: boolean; // Only show once per session
}

export function PromoPopup({ 
  type = 'discount', 
  delay = 5000,
  showOnce = true 
}: PromoPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    // Check if already shown this session
    if (showOnce) {
      const hasShown = sessionStorage.getItem('promo-popup-shown');
      if (hasShown) return;
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
      if (showOnce) {
        sessionStorage.setItem('promo-popup-shown', 'true');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, showOnce]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Simulate subscription
    toast.success('Welcome! Check your email for your discount code.');
    setHasSubmitted(true);
    setTimeout(() => setIsOpen(false), 2000);
  };

  const handleSpinWin = () => {
    setTimeout(() => setIsOpen(false), 3000);
  };

  const renderContent = () => {
    switch (type) {
      case 'spinwheel':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Spin to Win!</h2>
            <p className="text-muted-foreground mb-6">Try your luck and win exclusive discounts</p>
            <SpinWheel onWin={handleSpinWin} />
          </div>
        );

      case 'newsletter':
        return (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Stay in the Loop</h2>
            <p className="text-muted-foreground mb-6">
              Subscribe for exclusive offers, new arrivals, and style tips
            </p>
            {hasSubmitted ? (
              <div className="text-success font-medium">
                Thanks for subscribing! ✓
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-center"
                />
                <Button type="submit" className="w-full">
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        );

      case 'discount':
      default:
        return (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Percent className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Get 15% OFF</h2>
            <p className="text-muted-foreground mb-4">
              Subscribe and get 15% off your first order
            </p>
            <div className="bg-secondary px-4 py-3 rounded-xl font-mono text-xl font-bold mb-4">
              WELCOME15
            </div>
            {hasSubmitted ? (
              <div className="text-success font-medium">
                Code copied! Happy shopping! ✓
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-center"
                />
                <Button type="submit" className="w-full">
                  Get My Discount
                </Button>
              </form>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              By subscribing, you agree to receive marketing emails
            </p>
          </div>
        );
    }
  };

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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl p-8 mx-4 relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>

              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
