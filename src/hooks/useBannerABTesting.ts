import { useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Generate or retrieve session ID for anonymous tracking
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('ab_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('ab_session_id', sessionId);
  }
  return sessionId;
}

// Determine which variant to show based on traffic split
function selectVariant(trafficSplit: number, bannerId: string): 'A' | 'B' {
  // Use banner ID + session to ensure consistent variant per user per banner
  const sessionId = getSessionId();
  const hash = hashString(`${bannerId}-${sessionId}`);
  const percentage = hash % 100;
  return percentage < trafficSplit ? 'A' : 'B';
}

// Simple hash function for consistent variant selection
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export interface ABBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  abEnabled: boolean;
  abTrafficSplit: number;
  abVariantBContent: {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    ctaText?: string;
    ctaLink?: string;
  } | null;
}

export interface ABBannerWithVariant extends ABBanner {
  variant: 'A' | 'B';
  displayContent: {
    title: string;
    subtitle: string;
    imageUrl: string;
    ctaText: string;
    ctaLink: string;
  };
}

export function useBannerABTesting(banners: ABBanner[]) {
  const { user } = useAuth();
  const trackedViews = useRef<Set<string>>(new Set());

  // Assign variants to banners
  const bannersWithVariants = useMemo((): ABBannerWithVariant[] => {
    return banners.map((banner) => {
      if (!banner.abEnabled) {
        return {
          ...banner,
          variant: 'A' as const,
          displayContent: {
            title: banner.title,
            subtitle: banner.subtitle,
            imageUrl: banner.imageUrl,
            ctaText: banner.ctaText,
            ctaLink: banner.ctaLink,
          },
        };
      }

      const variant = selectVariant(banner.abTrafficSplit, banner.id);
      const isVariantB = variant === 'B' && banner.abVariantBContent;

      return {
        ...banner,
        variant,
        displayContent: {
          title: isVariantB ? banner.abVariantBContent?.title || banner.title : banner.title,
          subtitle: isVariantB
            ? banner.abVariantBContent?.subtitle || banner.subtitle
            : banner.subtitle,
          imageUrl: isVariantB
            ? banner.abVariantBContent?.imageUrl || banner.imageUrl
            : banner.imageUrl,
          ctaText: isVariantB
            ? banner.abVariantBContent?.ctaText || banner.ctaText
            : banner.ctaText,
          ctaLink: isVariantB
            ? banner.abVariantBContent?.ctaLink || banner.ctaLink
            : banner.ctaLink,
        },
      };
    });
  }, [banners]);

  // Track banner view
  const trackView = useCallback(
    async (bannerId: string, variant: 'A' | 'B') => {
      const viewKey = `${bannerId}-${variant}`;
      if (trackedViews.current.has(viewKey)) return;

      trackedViews.current.add(viewKey);

      try {
        await supabase.from('banner_ab_analytics').insert({
          banner_id: bannerId,
          variant,
          event_type: 'view',
          user_id: user?.id || null,
          session_id: getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track banner view:', error);
      }
    },
    [user?.id]
  );

  // Track banner click
  const trackClick = useCallback(
    async (bannerId: string, variant: 'A' | 'B') => {
      try {
        await supabase.from('banner_ab_analytics').insert({
          banner_id: bannerId,
          variant,
          event_type: 'click',
          user_id: user?.id || null,
          session_id: getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track banner click:', error);
      }
    },
    [user?.id]
  );

  return {
    bannersWithVariants,
    trackView,
    trackClick,
  };
}

// Hook for fetching A/B analytics in admin
export function useBannerABAnalytics(bannerId?: string) {
  const fetchAnalytics = useCallback(async () => {
    let query = supabase
      .from('banner_ab_analytics')
      .select('*')
      .order('created_at', { ascending: false });

    if (bannerId) {
      query = query.eq('banner_id', bannerId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate stats
    const stats: Record<
      string,
      {
        bannerId: string;
        variantA: { views: number; clicks: number; ctr: number };
        variantB: { views: number; clicks: number; ctr: number };
      }
    > = {};

    data?.forEach((entry) => {
      if (!stats[entry.banner_id]) {
        stats[entry.banner_id] = {
          bannerId: entry.banner_id,
          variantA: { views: 0, clicks: 0, ctr: 0 },
          variantB: { views: 0, clicks: 0, ctr: 0 },
        };
      }

      const variantKey = entry.variant === 'A' ? 'variantA' : 'variantB';
      if (entry.event_type === 'view') {
        stats[entry.banner_id][variantKey].views++;
      } else if (entry.event_type === 'click') {
        stats[entry.banner_id][variantKey].clicks++;
      }
    });

    // Calculate CTR
    Object.values(stats).forEach((stat) => {
      stat.variantA.ctr =
        stat.variantA.views > 0
          ? (stat.variantA.clicks / stat.variantA.views) * 100
          : 0;
      stat.variantB.ctr =
        stat.variantB.views > 0
          ? (stat.variantB.clicks / stat.variantB.views) * 100
          : 0;
    });

    return Object.values(stats);
  }, [bannerId]);

  return { fetchAnalytics };
}
