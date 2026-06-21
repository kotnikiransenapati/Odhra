import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LivePurchaseConfig {
  enabled: boolean;
  interval_seconds: number;
  display_seconds: number;
  lookback_days: number;
  max_per_session: number;
  mask_city: boolean;
  show_only_real: boolean;
  min_initial_delay_seconds: number;
}

export const DEFAULT_LIVE_PURCHASE_CONFIG: LivePurchaseConfig = {
  enabled: true,
  interval_seconds: 45,
  display_seconds: 5,
  lookback_days: 30,
  max_per_session: 8,
  mask_city: false,
  show_only_real: true,
  min_initial_delay_seconds: 15,
};

export function useLivePurchaseConfig() {
  return useQuery({
    queryKey: ['system_settings', 'live_purchase_notifications'],
    queryFn: async (): Promise<LivePurchaseConfig> => {
      const { data } = await (supabase as any)
        .from('system_settings')
        .select('value')
        .eq('key', 'live_purchase_notifications')
        .maybeSingle();
      return { ...DEFAULT_LIVE_PURCHASE_CONFIG, ...(data?.value || {}) };
    },
    staleTime: 5 * 60_000,
  });
}
