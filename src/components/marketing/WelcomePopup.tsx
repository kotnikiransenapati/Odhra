import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Mail, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

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
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Check if already shown to this visitor
    const hasShown = localStorage.getItem('welcome-popup-shown');
    if (hasShown) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
      localStorage.setItem('welcome-popup-shown', 'true');
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Welcome! Your discount code has been sent to your email!');
    
    // Auto close after showing success
    setTimeout(() => setIsOpen(false), 3000);
  };

  const handleClose = () => {
    setIsOpen(false);
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
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 px-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground"
                onClick={handleClose}
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Decorative header */}
              <div className="relative bg-gradient-to-br from-accent via-accent/90 to-primary p-8 text-accent-foreground overflow-hidden">
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
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-foreground/20 mb-4"
                  >
                    <Gift className="w-8 h-8" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold mb-1"
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
              <div className="p-6">
                {!isSubmitted ? (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <span className="text-5xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                          {discountPercentage}% OFF
                        </span>
                        <p className="text-muted-foreground mt-2">
                          Your first purchase
                        </p>
                      </motion.div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-12"
                          disabled={isSubmitting}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold gap-2"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                          />
                        ) : (
                          <>
                            Get My Discount
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </form>

                    <p className="text-center text-xs text-muted-foreground mt-4">
                      By subscribing, you agree to receive marketing emails. 
                      Unsubscribe anytime.
                    </p>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-500 mb-4"
                    >
                      <Sparkles className="w-8 h-8" />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-2">You're In!</h3>
                    <p className="text-muted-foreground mb-4">
                      Use code at checkout:
                    </p>
                    <div className="bg-secondary px-6 py-3 rounded-xl font-mono text-xl font-bold">
                      {discountCode}
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
