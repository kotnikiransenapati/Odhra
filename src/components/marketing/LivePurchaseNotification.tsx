import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Purchase {
  id: string;
  city: string;
  product: string;
  timeAgo: string;
}

// Names for social proof (randomized)
const names = ['Amit', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Ananya', 'Rajesh', 'Meera', 'Karan', 'Divya'];
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Lucknow'];

export function LivePurchaseNotification() {
  const [notification, setNotification] = useState<Purchase | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subscribe to new orders
    const channel = supabase
      .channel('live-purchases')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: 'payment_status=eq.paid',
        },
        async (payload) => {
          // Get a random product from the order
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_title')
            .eq('sub_order_id', payload.new.id)
            .limit(1);

          const product = orderItems?.[0]?.product_title || 'an item';
          const randomName = names[Math.floor(Math.random() * names.length)];
          const randomCity = cities[Math.floor(Math.random() * cities.length)];

          setNotification({
            id: payload.new.id,
            city: randomCity,
            product: product.length > 30 ? product.substring(0, 30) + '...' : product,
            timeAgo: 'just now',
          });
          setIsVisible(true);

          // Hide after 5 seconds
          setTimeout(() => setIsVisible(false), 5000);
        }
      )
      .subscribe();

    // Also show simulated notifications periodically for demo
    const simulateNotification = () => {
      if (Math.random() > 0.7) { // 30% chance to show
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        const products = [
          'Wireless Earbuds Pro',
          'Premium Cotton T-Shirt',
          'Smart Watch Series 5',
          'Leather Wallet',
          'Running Shoes',
        ];
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const timeOptions = ['just now', '2 mins ago', '5 mins ago'];
        const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];

        setNotification({
          id: Date.now().toString(),
          city: randomCity,
          product: randomProduct,
          timeAgo: randomTime,
        });
        setIsVisible(true);

        setTimeout(() => setIsVisible(false), 5000);
      }
    };

    // Initial delay before first notification
    const initialTimeout = setTimeout(() => {
      simulateNotification();
      // Then periodic checks
      const interval = setInterval(simulateNotification, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }, 15000); // First notification after 15 seconds

    return () => {
      channel.unsubscribe();
      clearTimeout(initialTimeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && notification && (
        <motion.div
          initial={{ opacity: 0, x: -100, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="fixed bottom-24 left-4 z-50 max-w-xs"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Someone just purchased
                </p>
                <p className="text-sm text-accent font-semibold truncate">
                  {notification.product}
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{notification.city}</span>
                  <span>•</span>
                  <span>{notification.timeAgo}</span>
                </div>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Progress bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-0.5 bg-accent"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
