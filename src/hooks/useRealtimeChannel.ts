import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Setup = (channel: RealtimeChannel) => RealtimeChannel | void;

/**
 * Subscribe to a Supabase Realtime channel with guaranteed cleanup.
 *
 *   useRealtimeChannel(`orders:${orderId}`, (channel) =>
 *     channel.on('postgres_changes',
 *       { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
 *       (payload) => onChange(payload),
 *     ),
 *     [orderId],
 *   );
 *
 * The channel is removed on unmount AND whenever `deps` change, preventing the
 * "duplicate subscription" memory leak we kept hitting in long admin sessions.
 */
export function useRealtimeChannel(
  channelName: string | null | undefined,
  setup: Setup,
  deps: React.DependencyList = [],
) {
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    if (!channelName) return;
    const channel = supabase.channel(channelName);
    setupRef.current(channel);
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, ...deps]);
}
