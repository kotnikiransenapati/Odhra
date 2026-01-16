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
}

export interface CMSSection {
  id: string;
  type: string;
  title: string;
  isActive: boolean;
  order: number;
  settings: Record<string, any>;
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
        return {
          id: banner.id,
          title: content.title || banner.title,
          subtitle: content.subtitle || '',
          imageUrl: content.imageUrl || '',
          ctaText: content.ctaText || 'Shop Now',
          ctaLink: content.ctaLink || '/shop',
          startsAt: banner.starts_at,
          endsAt: banner.ends_at,
        } as CMSBanner;
      });
    },
    staleTime: 0, // Always check for fresh data
    refetchOnWindowFocus: true,
  });
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
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(section => {
        const content = section.content as Record<string, any>;
        return {
          id: section.id,
          type: section.slug,
          title: section.title,
          isActive: section.is_active,
          order: section.sort_order,
          settings: content.settings || content || {},
        } as CMSSection;
      });
    },
    staleTime: 0, // Always check for fresh data
    refetchOnWindowFocus: true,
  });
}
