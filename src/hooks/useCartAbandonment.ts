import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

// Determine user segment based on order history
async function getUserSegment(userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .eq('customer_id', userId)
      .in('payment_status', ['paid', 'cod_pending']);
    
    if (!data || data.length === 0) return 'new';
    const totalSpent = data.reduce((s, o) => s + (o.total_amount || 0), 0);
    if (totalSpent >= 10000) return 'high_value';
    const lastOrder = new Date(data[data.length - 1].created_at);
    if (Date.now() - lastOrder.getTime() > 60 * 24 * 60 * 60 * 1000) return 'at_risk';
    return 'returning';
  } catch { return 'new'; }
}

// Track cart abandonment with product-level data
export function useCartAbandonmentTracker() {
  const { user } = useAuth();
  const { items } = useCart();
  const lastCartRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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

    // 30 min timer
    timerRef.current = setTimeout(async () => {
      try {
        const cartSnapshot = items.map(item => ({
          product_id: item.product_id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          image_url: item.image_url,
        }));

        const cartValue = items.reduce((s, i) => s + i.price * i.quantity, 0);
        const productIds = items.map(i => i.product_id);
        const segment = await getUserSegment(user.id);

        // Check for existing active event
        const { data: existing } = await supabase
          .from('cart_abandonment_events')
          .select('id')
          .eq('user_id', user.id)
          .eq('recovered', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from('cart_abandonment_events')
            .update({ 
              cart_snapshot: cartSnapshot,
              cart_value: cartValue,
              product_ids: productIds,
              user_segment: segment,
            } as any)
            .eq('id', existing[0].id);
        } else {
          await supabase
            .from('cart_abandonment_events')
            .insert({
              user_id: user.id,
              cart_snapshot: cartSnapshot,
              cart_value: cartValue,
              product_ids: productIds,
              user_segment: segment,
            } as any);
        }
      } catch {
        // Silent fail
      }
    }, 30 * 60 * 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, items]);
}

// Hook to handle cart recovery from email/whatsapp links
export function useCartRecovery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const recoveryCode = searchParams.get('recovery');
  const channel = searchParams.get('channel') || 'email';
  const processedRef = useRef(false);

  const recoverCart = useCallback(async () => {
    if (!recoveryCode || processedRef.current) return;
    processedRef.current = true;

    try {
      const { data: event } = await supabase
        .from('cart_abandonment_events')
        .select('*')
        .eq('recovery_code', recoveryCode)
        .eq('recovered', false)
        .single();

      if (!event) {
        toast.info('This recovery link has already been used or expired.');
        searchParams.delete('recovery');
        searchParams.delete('channel');
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
        searchParams.delete('channel');
        setSearchParams(searchParams, { replace: true });
        return;
      }

      let addedCount = 0;
      for (const item of cartItems) {
        try {
          await addItem(item.product_id, item.quantity);
          addedCount++;
        } catch { /* Item might be out of stock */ }
      }

      if (addedCount > 0) {
        toast.success(`🛒 ${addedCount} item${addedCount > 1 ? 's' : ''} restored to your cart!`);
      }

      // Mark as recovered with channel attribution
      const cartValue = (event as any).cart_value || 0;
      await supabase
        .from('cart_abandonment_events')
        .update({ 
          recovered: true,
          recovery_channel: channel,
          recovered_at: new Date().toISOString(),
          recovered_revenue: cartValue,
        } as any)
        .eq('id', event.id);

      // Track campaign event
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
              p_metadata: { recovery_code: recoveryCode, items_recovered: addedCount, channel },
            });
          }
        } catch { /* non-fatal */ }
      }

      searchParams.delete('recovery');
      searchParams.delete('channel');
      setSearchParams(searchParams, { replace: true });
    } catch (err) {
      console.error('Cart recovery error:', err);
      searchParams.delete('recovery');
      searchParams.delete('channel');
      setSearchParams(searchParams, { replace: true });
    }
  }, [recoveryCode]);

  useEffect(() => {
    if (recoveryCode) recoverCart();
  }, [recoveryCode, recoverCart]);

  return { isRecovering: !!recoveryCode && !processedRef.current };
}
