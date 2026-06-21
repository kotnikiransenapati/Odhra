import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, MapPin, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchRecentPaidPurchases,
  fetchOrderItemByOrderId,
  fetchProductImageByProductId,
  type RecentPurchase,
} from '@/lib/notificationApi';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useLivePurchaseConfig } from '@/hooks/useLivePurchaseConfig';

interface DisplayPurchase {
  id: string;
  city: string;
  product: string;
  timeAgo: string;
  imageUrl?: string;
  isLive: boolean;
}

const HIDDEN_PATH_PREFIXES = ['/admin', '/checkout', '/vendor', '/auth'];
const SESSION_KEY = 'live_purchase_shown_count';

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function maskCity(city: string | null): string {
  if (!city) return 'India';
  if (city.length <= 3) return city[0] + '••';
  return city.slice(0, 2) + '•••' + city.slice(-1);
}

function truncate(s: string, n = 40) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function LivePurchaseNotification() {
  const { isEnabled } = useFeatureFlag('live_purchase_notifications');
  const { data: config } = useLivePurchaseConfig();
  const location = useLocation();
  const [notification, setNotification] = useState<DisplayPurchase | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const purchasesRef = useRef<RecentPurchase[]>([]);
  const cursorRef = useRef(0);
  const recentlyShownIdsRef = useRef<Set<string>>(new Set());

  const pathHidden = HIDDEN_PATH_PREFIXES.some((p) => location.pathname.startsWith(p));
  const flagEnabled = isEnabled && config?.enabled !== false && !pathHidden;

  // Load real recent purchases
  useEffect(() => {
    if (!flagEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchRecentPaidPurchases(
          config?.lookback_days ?? 30,
          25,
        );
        if (cancelled) return;
        // Shuffle for variety
        purchasesRef.current = [...list].sort(() => Math.random() - 0.5);
      } catch (err) {
        console.error('[LivePurchase] load failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [flagEnabled, config?.lookback_days]);

  const showFromPurchase = useCallback(
    (p: RecentPurchase, isLive: boolean) => {
      if (recentlyShownIdsRef.current.has(p.order_id)) return;
      recentlyShownIdsRef.current.add(p.order_id);

      const sessionCount = Number(sessionStorage.getItem(SESSION_KEY) || '0');
      const max = config?.max_per_session ?? 8;
      if (sessionCount >= max) return;
      sessionStorage.setItem(SESSION_KEY, String(sessionCount + 1));

      setNotification({
        id: `${p.order_id}-${Date.now()}`,
        city: config?.mask_city ? maskCity(p.city) : p.city || 'India',
        product: truncate(p.product_title),
        timeAgo: isLive ? 'just now' : formatTimeAgo(p.created_at),
        imageUrl: p.image_url || undefined,
        isLive,
      });
      setIsVisible(true);
      const ms = (config?.display_seconds ?? 5) * 1000;
      setTimeout(() => setIsVisible(false), ms);
    },
    [config],
  );

  // Realtime subscription for live paid orders
  useEffect(() => {
    if (!flagEnabled) return;
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
            const newOrder = payload.new as { id: string; created_at: string; shipping_address?: any };
            const item = await fetchOrderItemByOrderId(newOrder.id);
            if (!item) return;
            const imageUrl = await fetchProductImageByProductId(item.product_id);
            showFromPurchase(
              {
                order_id: newOrder.id,
                created_at: newOrder.created_at || new Date().toISOString(),
                city: newOrder.shipping_address?.city || null,
                product_id: item.product_id,
                product_title: item.product_title || 'an item',
                image_url: imageUrl,
              },
              true,
            );
          } catch (err) {
            console.error('[LivePurchase] realtime error:', err);
          }
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [flagEnabled, showFromPurchase]);

  // Rotate through real recent purchases on a timer
  useEffect(() => {
    if (!flagEnabled) return;
    const rotate = () => {
      if (document.hidden) return; // pause when tab not focused
      const list = purchasesRef.current;
      if (!list.length) return;
      const p = list[cursorRef.current % list.length];
      cursorRef.current += 1;
      showFromPurchase(p, false);
    };
    const initial = setTimeout(rotate, (config?.min_initial_delay_seconds ?? 15) * 1000);
    const interval = setInterval(rotate, (config?.interval_seconds ?? 45) * 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [flagEnabled, config?.interval_seconds, config?.min_initial_delay_seconds, showFromPurchase]);

  if (!flagEnabled) return null;

  return (
    <AnimatePresence>
      {isVisible && notification && (
        <motion.div
          initial={{ opacity: 0, x: -100, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-24 left-4 z-50 max-w-xs"
          role="status"
          aria-live="polite"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              {notification.imageUrl ? (
                <img
                  src={notification.imageUrl}
                  alt=""
                  loading="lazy"
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-accent" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-1">
                  Someone just purchased
                  {notification.isLive && (
                    <BadgeCheck className="w-3.5 h-3.5 text-success" aria-label="Live order" />
                  )}
                </p>
                <p className="text-sm text-accent font-semibold truncate">{notification.product}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{notification.city}</span>
                  <span>•</span>
                  <span>{notification.timeAgo}</span>
                </div>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <motion.div
              key={notification.id}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: config?.display_seconds ?? 5, ease: 'linear' }}
              className="h-0.5 bg-accent"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
