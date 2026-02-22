import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

// Track cart abandonment - fires when user has items but leaves
export function useCartAbandonmentTracker() {
  const { user } = useAuth();
  const { items } = useCart();
  const hasTrackedRef = useRef(false);
  const lastCartRef = useRef<string>('');

  useEffect(() => {
    if (!user || items.length === 0) {
      hasTrackedRef.current = false;
      return;
    }

    const cartKey = items.map(i => `${i.product_id}:${i.quantity}`).join(',');
    if (cartKey === lastCartRef.current) return;
    lastCartRef.current = cartKey;

    // Set a timer - if user doesn't checkout within 30 min, record abandonment
    const timer = setTimeout(async () => {
      try {
        const cartSnapshot = items.map(item => ({
          product_id: item.product_id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          image_url: item.image_url,
        }));

        await supabase
          .from('cart_abandonment_events')
          .insert({
            user_id: user.id,
            cart_snapshot: cartSnapshot,
          });

        // Trigger the edge function to send email
        await supabase.functions.invoke('cart-abandonment-email', {
          body: {
            userId: user.id,
            cartItems: cartSnapshot,
          },
        });
      } catch {
        // Silent fail - don't disrupt user experience
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearTimeout(timer);
  }, [user, items]);
}
