import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SiteTemplate = 'default' | 'ecommerce' | 'food';

export const SITE_TEMPLATES: { id: SiteTemplate; label: string; description: string }[] = [
  { id: 'default', label: 'Default (Editorial Utility)', description: 'Current navy + pink editorial commerce design.' },
  { id: 'ecommerce', label: 'Advanced Ecommerce', description: 'Amazon-style high-density storefront with utility-first navigation, dense product cards, and price-forward hierarchy.' },
  { id: 'food', label: 'Advanced Food / Restaurant', description: 'Appetite-driven food marketplace with bold imagery, cuisine rails, dish cards, and warm color system.' },
];

const SETTING_KEY = 'site_template';

export function useSiteTemplate() {
  const query = useQuery({
    queryKey: ['system_settings', SETTING_KEY],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SiteTemplate> => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();
      const v = (data?.value as any)?.template ?? (data?.value as any);
      if (v === 'ecommerce' || v === 'food' || v === 'default') return v;
      return 'default';
    },
  });
  return { template: query.data ?? 'default', isLoading: query.isLoading };
}
