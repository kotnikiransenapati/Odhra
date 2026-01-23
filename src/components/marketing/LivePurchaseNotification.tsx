import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchActiveProducts, 
  fetchProductImages, 
  fetchOrderItemByOrderId, 
  fetchProductImageByProductId 
} from '@/lib/notificationApi';

interface Purchase {
  id: string;
  city: string;
  product: string;
  timeAgo: string;
  imageUrl?: string;
}

interface CachedProduct {
  id: string;
  title: string;
  imageUrl?: string;
}

// Indian cities for location display
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Lucknow'];

export function LivePurchaseNotification() {
  const [notification, setNotification] = useState<Purchase | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const productsRef = useRef<CachedProduct[]>([]);

  // Fetch real products from database on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await fetchActiveProducts(20);
        if (products.length === 0) return;

        const productIds = products.map(p => p.id);
        const images = await fetchProductImages(productIds);

        // Map products with their primary images
        productsRef.current = products.map(p => {
          const productImages = images.filter(img => img.product_id === p.id);
          const primaryImage = productImages.find(img => img.is_primary)?.url 
            || productImages[0]?.url;
          return {
            id: p.id,
            title: p.title,
            imageUrl: primaryImage,
          };
        });
      } catch (err) {
        console.error('Error fetching products for notifications:', err);
      }
    };

    loadProducts();
  }, []);

  const showNotification = useCallback((product: CachedProduct, timeAgo: string) => {
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const title = product.title || 'an item';

    setNotification({
      id: `${product.id}-${Date.now()}`,
      city: randomCity,
      product: title.length > 35 ? title.substring(0, 35) + '...' : title,
      timeAgo,
      imageUrl: product.imageUrl,
    });
    setIsVisible(true);

    // Hide after 5 seconds
    setTimeout(() => setIsVisible(false), 5000);
  }, []);

  useEffect(() => {
    // Subscribe to new paid orders for real-time notifications
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
          try {
            const newOrder = payload.new as { id: string };
            
            const item = await fetchOrderItemByOrderId(newOrder.id);
            if (item) {
              const imageUrl = await fetchProductImageByProductId(item.product_id);
              
              showNotification({
                id: newOrder.id,
                title: item.product_title || 'an item',
                imageUrl: imageUrl || undefined,
              }, 'just now');
            }
          } catch (err) {
            console.error('Error handling live purchase:', err);
          }
        }
      )
      .subscribe();

    // Show simulated notifications with REAL products periodically
    const simulateNotification = () => {
      const products = productsRef.current;
      // Only show if we have real products and random chance passes (40% chance)
      if (products.length > 0 && Math.random() > 0.6) {
        const product = products[Math.floor(Math.random() * products.length)];
        const timeOptions = ['just now', '2 mins ago', '5 mins ago', '8 mins ago'];
        const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];
        showNotification(product, randomTime);
      }
    };

    // Initial delay before first notification (20 seconds)
    const initialTimeout = setTimeout(() => {
      simulateNotification();
    }, 20000);

    // Periodic notifications every 45 seconds
    const interval = setInterval(simulateNotification, 45000);

    return () => {
      channel.unsubscribe();
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [showNotification]);

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
              {/* Product image or icon */}
              {notification.imageUrl ? (
                <img 
                  src={notification.imageUrl} 
                  alt="" 
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-accent" />
                </div>
              )}
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
