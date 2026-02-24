import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useShareReward } from '@/hooks/useShareReward';
import { ShareSheet } from '@/components/sharing/ShareSheet';
import { buildProductShareable, type ShareChannel } from '@/lib/linkBuilder';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ShareEarnSectionProps {
  productId: string;
  productTitle: string;
  productSlug: string;
  productPrice?: number;
  productCompareAtPrice?: number | null;
}

export function ShareEarnSection({ productId, productTitle, productSlug, productPrice = 0, productCompareAtPrice }: ShareEarnSectionProps) {
  const { user } = useAuth();
  const { shareProduct, shareData, isSharing } = useShareReward(productId);

  // Fetch feature flag settings for share_earn (admin-controlled)
  const { data: featureConfig, isLoading: configLoading } = useQuery({
    queryKey: ['feature-flag', 'share_earn'],
    queryFn: async () => {
      const { data } = await supabase
        .from('feature_flags')
        .select('is_enabled, settings')
        .eq('feature_key', 'share_earn')
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Don't render if feature is disabled by admin or user not logged in
  if (!user) return null;
  if (configLoading) return null;
  if (featureConfig && !featureConfig.is_enabled) return null;

  // Get commission settings from admin config
  const settings = (featureConfig?.settings || {}) as Record<string, any>;
  const commissionPercentage = Number(settings.commission_percentage) || 5;
  const minReward = Number(settings.min_reward) || 10;
  const maxReward = Number(settings.max_reward) || 500;

  // Calculate reward based on percentage of product price
  const rawReward = Math.round(productPrice * (commissionPercentage / 100));
  const estimatedReward = Math.max(minReward, Math.min(rawReward, maxReward));

  const shareable = buildProductShareable(
    { title: productTitle, slug: productSlug, price: productPrice, compareAtPrice: productCompareAtPrice },
    { ref: user.id.slice(0, 8) }
  );

  const handleShare = (channel: ShareChannel) => {
    shareProduct(channel, productTitle, productSlug);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20"
    >
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-4 h-4 text-accent" />
        <h4 className="text-sm font-semibold">Share & Earn ₹{estimatedReward}</h4>
        <span className="text-xs text-muted-foreground ml-auto">({commissionPercentage}% commission)</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Share this product with friends. Earn {commissionPercentage}% (₹{minReward}–₹{maxReward}) for every purchase through your link!
      </p>
      <ShareSheet shareable={shareable} onShare={handleShare} />
      {shareData && shareData.conversions > 0 && (
        <p className="text-xs text-success font-medium mt-2">
          🎉 You've earned ₹{shareData.reward_earned} from {shareData.conversions} referral{shareData.conversions > 1 ? 's' : ''}!
        </p>
      )}
    </motion.div>
  );
}
