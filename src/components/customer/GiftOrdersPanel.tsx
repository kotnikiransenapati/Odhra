import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Gift, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface GiftOrder {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  gift_recipient_name: string | null;
  gift_message: string | null;
  status: string;
}

/**
 * Lists past orders flagged as gifts so the user can quickly find a
 * tracking link / re-print the card. Uses the partial index
 * idx_orders_is_gift for sub-ms reads.
 */
export function GiftOrdersPanel() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<GiftOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total_amount, gift_recipient_name, gift_message, status')
        .eq('customer_id', user.id)
        .eq('is_gift', true)
        .order('created_at', { ascending: false })
        .limit(5);
      if (active && data) setOrders(data as GiftOrder[]);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user || (!loading && orders.length === 0)) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5 border border-border/40"
      aria-labelledby="gift-orders-heading"
    >
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-accent" aria-hidden />
        <h2 id="gift-orders-heading" className="font-semibold">Your Gift Orders</h2>
        <Badge variant="outline" className="ml-auto text-xs">{orders.length}</Badge>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                to={`/account/orders/${o.id}`}
                className="card-interactive flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 p-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-accent" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {o.gift_recipient_name || 'Gift'} · #{o.order_number}
                  </p>
                  {o.gift_message && (
                    <p className="text-xs text-muted-foreground truncate italic">"{o.gift_message}"</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(o.created_at), 'd MMM yyyy')} · ₹{o.total_amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize text-[10px]">{o.status.replace('_', ' ')}</Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}
