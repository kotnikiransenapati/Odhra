import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

// Track cart abandonment - fires when user has items but leaves
export function useCartAbandonmentTracker() {
  const { user } = useAuth();
  const { items } = useCart();
  const lastCartRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!user || items.length === 0) {
      lastCartRef.current = '';
      return;
    }

    const cartKey = items.map(i => `${i.product_id}:${i.quantity}`).join(',');
    if (cartKey === lastCartRef.current) return;
    lastCartRef.current = cartKey;

    // Set a timer - if user doesn't checkout within 30 min, record abandonment
    timerRef.current = setTimeout(async () => {
      try {
        const cartSnapshot = items.map(item => ({
          product_id: item.product_id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          image_url: item.image_url,
        }));

        // Check if there's already an active (unrecovered) event for this user
        const { data: existing } = await supabase
          .from('cart_abandonment_events')
          .select('id')
          .eq('user_id', user.id)
          .eq('recovered', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          // Update existing event with latest cart
          await supabase
            .from('cart_abandonment_events')
            .update({ cart_snapshot: cartSnapshot })
            .eq('id', existing[0].id);
        } else {
          // Create new event
          await supabase
            .from('cart_abandonment_events')
            .insert({
              user_id: user.id,
              cart_snapshot: cartSnapshot,
            });
        }
      } catch {
        // Silent fail - don't disrupt user experience
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, items]);
}

// Hook to handle cart recovery from email links
export function useCartRecovery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const recoveryCode = searchParams.get('recovery');
  const processedRef = useRef(false);

  const recoverCart = useCallback(async () => {
    if (!recoveryCode || processedRef.current) return;
    processedRef.current = true;

    try {
      // Find the abandonment event with this recovery code
      const { data: event } = await supabase
        .from('cart_abandonment_events')
        .select('*')
        .eq('recovery_code', recoveryCode)
        .eq('recovered', false)
        .single();

      if (!event) {
        toast.info('This recovery link has already been used or expired.');
        // Clean URL
        searchParams.delete('recovery');
        setSearchParams(searchParams, { replace: true });
        return;
      }

      const cartItems = (event.cart_snapshot as unknown as Array<{
        product_id: string;
        quantity: number;
        title?: string;
      }>) || [];

      if (cartItems.length === 0) {
        searchParams.delete('recovery');
        setSearchParams(searchParams, { replace: true });
        return;
      }

      // Add items to cart
      let addedCount = 0;
      for (const item of cartItems) {
        try {
          await addItem(item.product_id, item.quantity);
          addedCount++;
        } catch {
          // Item might be out of stock
        }
      }

      if (addedCount > 0) {
        toast.success(`🛒 ${addedCount} item${addedCount > 1 ? 's' : ''} restored to your cart!`);
      }

      // Mark as recovered
      await supabase
        .from('cart_abandonment_events')
        .update({ recovered: true })
        .eq('id', event.id);

      // Track the recovery event if there's a campaign link
      const campaignData = sessionStorage.getItem('odhra_campaign');
      if (campaignData) {
        try {
          const campaign = JSON.parse(campaignData);
          if (campaign.link_id) {
            await supabase.rpc('track_campaign_event', {
              p_code: campaign.code,
              p_event_type: 'cart_recovery',
              p_session_id: sessionStorage.getItem('odhra_session_id') || crypto.randomUUID(),
              p_user_id: user?.id || null,
              p_referrer: document.referrer || null,
              p_device_info: {},
              p_metadata: { recovery_code: recoveryCode, items_recovered: addedCount },
            });
          }
        } catch {
          // non-fatal
        }
      }

      // Clean URL
      searchParams.delete('recovery');
      setSearchParams(searchParams, { replace: true });
    } catch (err) {
      console.error('Cart recovery error:', err);
      searchParams.delete('recovery');
      setSearchParams(searchParams, { replace: true });
    }
  }, [recoveryCode]);

  useEffect(() => {
    if (recoveryCode) {
      recoverCart();
    }
  }, [recoveryCode, recoverCart]);

  return { isRecovering: !!recoveryCode && !processedRef.current };
}
