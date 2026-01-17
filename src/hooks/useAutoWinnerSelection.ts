import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ABStats {
  bannerId: string;
  variantA: { views: number; clicks: number };
  variantB: { views: number; clicks: number };
}

interface WinnerResult {
  winner: 'A' | 'B' | 'none';
  confidence: number;
  isSignificant: boolean;
}

// Statistical significance calculation using Z-test for proportions
function calculateStatisticalSignificance(
  viewsA: number,
  clicksA: number,
  viewsB: number,
  clicksB: number
): WinnerResult {
  // Minimum sample size for reliable results
  if (viewsA < 100 || viewsB < 100) {
    return { winner: 'none', confidence: 0, isSignificant: false };
  }

  const pA = clicksA / viewsA;
  const pB = clicksB / viewsB;
  
  // Pooled proportion
  const pPooled = (clicksA + clicksB) / (viewsA + viewsB);
  
  // Standard error
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / viewsA + 1 / viewsB));
  
  if (se === 0) {
    return { winner: 'none', confidence: 0, isSignificant: false };
  }
  
  // Z-score
  const z = Math.abs(pA - pB) / se;
  
  // Convert Z-score to confidence level
  let confidence = 0;
  if (z >= 2.576) confidence = 99;
  else if (z >= 2.326) confidence = 98;
  else if (z >= 1.96) confidence = 95;
  else if (z >= 1.645) confidence = 90;
  else if (z >= 1.28) confidence = 80;
  else confidence = Math.min(70, z * 35);

  const isSignificant = confidence >= 95;
  const winner: 'A' | 'B' | 'none' = 
    !isSignificant ? 'none' : 
    pA > pB ? 'A' : 'B';

  return { winner, confidence, isSignificant };
}

async function fetchABAnalytics(): Promise<ABStats[]> {
  const { data, error } = await supabase
    .from('banner_ab_analytics')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Aggregate stats
  const stats: Record<string, ABStats> = {};

  data?.forEach((entry) => {
    if (!stats[entry.banner_id]) {
      stats[entry.banner_id] = {
        bannerId: entry.banner_id,
        variantA: { views: 0, clicks: 0 },
        variantB: { views: 0, clicks: 0 },
      };
    }

    const variantKey = entry.variant === 'A' ? 'variantA' : 'variantB';
    if (entry.event_type === 'view') {
      stats[entry.banner_id][variantKey].views++;
    } else if (entry.event_type === 'click') {
      stats[entry.banner_id][variantKey].clicks++;
    }
  });

  return Object.values(stats);
}

async function promoteWinner(bannerId: string, winner: 'A' | 'B'): Promise<void> {
  if (winner === 'B') {
    // Get current banner data
    const { data: banner } = await supabase
      .from('cms_content')
      .select('*')
      .eq('id', bannerId)
      .single();

    if (!banner) throw new Error('Banner not found');

    const currentContent = banner.content as Record<string, any>;
    const variantBContent = (banner as any).ab_variant_b_content || {};

    // Merge variant B content into main content
    const newContent = {
      ...currentContent,
      title: variantBContent.title || currentContent.title,
      subtitle: variantBContent.subtitle || currentContent.subtitle,
      imageUrl: variantBContent.imageUrl || currentContent.imageUrl,
      ctaText: variantBContent.ctaText || currentContent.ctaText,
      ctaLink: variantBContent.ctaLink || currentContent.ctaLink,
    };

    // Update banner with winner content and disable A/B testing
    await supabase
      .from('cms_content')
      .update({
        content: newContent,
        title: variantBContent.title || banner.title,
        ab_enabled: false,
        ab_variant_b_content: null,
      })
      .eq('id', bannerId);
  } else {
    // For variant A, just disable A/B testing (keep current content)
    await supabase
      .from('cms_content')
      .update({
        ab_enabled: false,
        ab_variant_b_content: null,
      })
      .eq('id', bannerId);
  }
}

// Hook for automatic winner selection (runs in background)
export function useAutoWinnerSelection(options?: { 
  enabled?: boolean; 
  checkInterval?: number;
  autoPromote?: boolean;
  minSampleSize?: number;
  confidenceThreshold?: number;
}) {
  const {
    enabled = false,
    checkInterval = 60000, // Check every minute
    autoPromote = false,
    minSampleSize = 200,
    confidenceThreshold = 95,
  } = options || {};

  const isRunning = useRef(false);
  const lastCheck = useRef<number>(0);

  const checkForWinners = useCallback(async () => {
    if (isRunning.current) return;
    
    isRunning.current = true;
    try {
      const stats = await fetchABAnalytics();
      
      // Get active A/B tests
      const { data: activeBanners } = await supabase
        .from('cms_content')
        .select('id, title')
        .eq('type', 'hero_banner')
        .eq('ab_enabled', true);

      if (!activeBanners) return;

      for (const banner of activeBanners) {
        const bannerStats = stats.find(s => s.bannerId === banner.id);
        if (!bannerStats) continue;

        const totalViews = bannerStats.variantA.views + bannerStats.variantB.views;
        
        // Check if we have enough samples
        if (totalViews < minSampleSize) continue;

        const result = calculateStatisticalSignificance(
          bannerStats.variantA.views,
          bannerStats.variantA.clicks,
          bannerStats.variantB.views,
          bannerStats.variantB.clicks
        );

        if (result.isSignificant && result.confidence >= confidenceThreshold && result.winner !== 'none') {
          console.log(`[A/B Auto] Winner found for banner "${banner.title}": Variant ${result.winner} (${result.confidence}% confidence)`);
          
          if (autoPromote) {
            await promoteWinner(banner.id, result.winner);
            toast.success(
              `🏆 A/B Test Winner: Variant ${result.winner} has been automatically promoted for "${banner.title}"`,
              { duration: 8000 }
            );
          } else {
            // Just notify, don't auto-promote
            toast.info(
              `📊 A/B Test: Variant ${result.winner} is winning for "${banner.title}" with ${result.confidence}% confidence`,
              { duration: 10000 }
            );
          }
        }
      }

      lastCheck.current = Date.now();
    } catch (error) {
      console.error('[A/B Auto] Error checking for winners:', error);
    } finally {
      isRunning.current = false;
    }
  }, [autoPromote, minSampleSize, confidenceThreshold]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkForWinners();

    // Set up interval
    const interval = setInterval(checkForWinners, checkInterval);

    return () => clearInterval(interval);
  }, [enabled, checkInterval, checkForWinners]);

  return {
    checkForWinners,
    lastCheck: lastCheck.current,
  };
}

// Utility hook for manually triggering winner check
export function useManualWinnerCheck() {
  const checkAndPromote = useCallback(async (bannerId: string, winner: 'A' | 'B') => {
    try {
      await promoteWinner(bannerId, winner);
      return { success: true };
    } catch (error) {
      console.error('Failed to promote winner:', error);
      return { success: false, error };
    }
  }, []);

  return { checkAndPromote };
}
