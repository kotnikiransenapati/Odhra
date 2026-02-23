import React from 'react';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useShareReward } from '@/hooks/useShareReward';
import { ShareSheet } from '@/components/sharing/ShareSheet';
import { buildProductShareable, type ShareChannel } from '@/lib/linkBuilder';

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

  if (!user) return null;

  const shareable = buildProductShareable(
    { title: productTitle, slug: productSlug, price: productPrice, compareAtPrice: productCompareAtPrice },
    { ref: user.id.slice(0, 8) }
  );

  const handleShare = (channel: ShareChannel) => {
    // Also track the share in the rewards system
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
        <h4 className="text-sm font-semibold">Share & Earn ₹50</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Share this product with friends. Earn ₹50 for every purchase through your link!
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
