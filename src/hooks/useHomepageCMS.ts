import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface CMSBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  startsAt: string | null;
  endsAt: string | null;
  abEnabled?: boolean;
  abTrafficSplit?: number;
  abVariantBContent?: Record<string, any> | null;
  // Styling fields
  bgColor?: string;
  badge?: string;
  badgeColor?: string;
  offerText?: string;
  price?: string;
  // Display mode
  imageOnly?: boolean;
  customBgColor?: string;
}

export interface CMSSection {
  id: string;
  type: string;
  title: string;
  isActive: boolean;
  order: number;
  settings: Record<string, any>;
}

export interface PromoStripContent {
  id: string;
  message: string;
  link?: string;
  linkText?: string;
  countdownTo?: string | null;
  isActive: boolean;
}

export function useHomepageBanners() {
  const queryClient = useQueryClient();

  // Set up real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('homepage-banners-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_content',
        },
        (payload) => {
          console.log('CMS banner changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['homepage-banners'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['homepage-banners'],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('type', 'hero_banner')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Filter banners by scheduling (starts_at and ends_at)
      const activeBanners = (data || []).filter(banner => {
        const startsAt = banner.starts_at;
        const endsAt = banner.ends_at;
        
        // If no scheduling, show banner
        if (!startsAt && !endsAt) return true;
        
        // Check if current time is within scheduled range
        if (startsAt && new Date(startsAt) > new Date(now)) return false;
        if (endsAt && new Date(endsAt) < new Date(now)) return false;
        
        return true;
      });

      return activeBanners.map(banner => {
        const content = banner.content as Record<string, any>;
        // Use imageUrl from content - this is where CMS stores uploaded images
        const imageUrl = content.imageUrl || '';
        
        return {
          id: banner.id,
          title: content.title || banner.title,
          subtitle: content.subtitle || '',
          imageUrl: imageUrl,
          ctaText: content.ctaText || 'Shop Now',
          ctaLink: content.ctaLink || '/shop',
          startsAt: banner.starts_at,
          endsAt: banner.ends_at,
          abEnabled: (banner as any).ab_enabled || false,
          abTrafficSplit: (banner as any).ab_traffic_split || 50,
          abVariantBContent: (banner as any).ab_variant_b_content || null,
          // Styling fields
          bgColor: content.bgColor || '',
          badge: content.badge || '',
          badgeColor: content.badgeColor || '',
          offerText: content.offerText || '',
          price: content.price || '',
          // Display mode
          imageOnly: content.imageOnly || false,
          customBgColor: content.customBgColor || '',
        } as CMSBanner;
      });
    },
    staleTime: 2 * 60 * 1000, // 2 minutes — realtime subscription handles instant updates
    refetchOnWindowFocus: false,
  });
}

// Mapping from legacy DB slugs to canonical section types
const SLUG_TO_TYPE: Record<string, string> = {
  'hero-slider': 'hero',
  'trending-products': 'trending',
  'featured-products': 'featured',
  'recommended-products': 'recommended',
  'customer-stories': 'stories',
  'delivery-reviews': 'reviews',
  'spin-wheel': 'spinwheel',
  'trust-badges': 'trust-badges',
  'vendor-cta': 'vendor-cta',
  'categories': 'categories',
  'quick-services': 'quick-services',
  'category-tabs': 'category-tabs',
  'deals': 'deals',
  'bestsellers': 'bestsellers',
  'new-arrivals': 'new-arrivals',
  'promo-strip': 'promo-strip',
  'previously-purchased': 'previously-purchased',
  'recently-viewed': 'recently-viewed',
};

function normalizeSlugToType(slug: string): string {
  return SLUG_TO_TYPE[slug] ?? slug;
}

export function useHomepageSections() {
  const queryClient = useQueryClient();

  // Set up real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('homepage-sections-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_content',
        },
        (payload) => {
          console.log('CMS section changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['homepage-sections'],
    queryFn: async () => {
      // Check both 'homepage_section' and 'section' types for backward compatibility
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .in('type', ['homepage_section', 'section'])
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(section => {
        const content = section.content as Record<string, any>;
        // Normalize the slug to canonical type
        const normalizedType = normalizeSlugToType(section.slug);
        return {
          id: section.id,
          type: normalizedType,
          title: section.title,
          isActive: section.is_active,
          order: section.sort_order,
          settings: content.settings || content || {},
        } as CMSSection;
      });
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePromoStripContent() {
  const queryClient = useQueryClient();

  // Set up real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('promo-strip-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_content',
        },
        (payload) => {
          console.log('Promo strip changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['promo-strip'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['promo-strip'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('type', 'promo_strip')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const content = data.content as Record<string, any>;
      
      // Check scheduling
      const now = new Date();
      if (data.starts_at && new Date(data.starts_at) > now) return null;
      if (data.ends_at && new Date(data.ends_at) < now) return null;

      return {
        id: data.id,
        message: content.message || '',
        link: content.link || undefined,
        linkText: content.linkText || 'Shop Now',
        countdownTo: data.ends_at || content.countdownTo || null,
        isActive: data.is_active,
      } as PromoStripContent;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
