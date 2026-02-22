import React from 'react';
import { motion } from 'framer-motion';
import { Share2, Gift, Copy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShareReward } from '@/hooks/useShareReward';
import { useAuth } from '@/contexts/AuthContext';

interface ShareEarnSectionProps {
  productId: string;
  productTitle: string;
  productSlug: string;
}

export function ShareEarnSection({ productId, productTitle, productSlug }: ShareEarnSectionProps) {
  const { user } = useAuth();
  const { shareProduct, shareData, isSharing } = useShareReward(productId);

  if (!user) return null;

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
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs flex-1"
          onClick={() => shareProduct('whatsapp', productTitle, productSlug)}
          disabled={isSharing}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs flex-1"
          onClick={() => shareProduct('copy', productTitle, productSlug)}
          disabled={isSharing}
        >
          <Copy className="w-3.5 h-3.5" />
          Copy Link
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => shareProduct('native', productTitle, productSlug)}
          disabled={isSharing}
        >
          <Share2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      {shareData && shareData.conversions > 0 && (
        <p className="text-xs text-success font-medium mt-2">
          🎉 You've earned ₹{shareData.reward_earned} from {shareData.conversions} referral{shareData.conversions > 1 ? 's' : ''}!
        </p>
      )}
    </motion.div>
  );
}
