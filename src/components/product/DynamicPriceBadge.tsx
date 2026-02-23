import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, Zap, Clock, Flame } from 'lucide-react';
import { useDynamicPrice } from '@/hooks/useDynamicPricing';
import { Badge } from '@/components/ui/badge';

interface DynamicPriceBadgeProps {
  productId: string;
  currentPrice: number;
  /** Compact mode for product cards */
  compact?: boolean;
}

export function DynamicPriceBadge({ productId, currentPrice, compact = false }: DynamicPriceBadgeProps) {
  const { data: dynamicPrice, isLoading } = useDynamicPrice(productId);

  if (isLoading || !dynamicPrice) return null;

  const hasDiscount = dynamicPrice.discount > 0;
  const hasRules = dynamicPrice.applied_rules?.length > 0;

  if (!hasDiscount && !hasRules) return null;

  const discountPct = dynamicPrice.discount_percentage;

  // Pick badge style based on discount magnitude
  const getBadgeConfig = () => {
    if (discountPct >= 25) {
      return {
        icon: Flame,
        label: compact ? `-${Math.round(discountPct)}%` : `${Math.round(discountPct)}% OFF — Limited Pricing`,
        className: 'bg-destructive/15 text-destructive border-destructive/25',
        animate: true,
      };
    }
    if (discountPct >= 10) {
      return {
        icon: Zap,
        label: compact ? `-${Math.round(discountPct)}%` : `Save ${Math.round(discountPct)}% — Smart Price`,
        className: 'bg-warning/15 text-warning border-warning/25',
        animate: false,
      };
    }
    return {
      icon: TrendingDown,
      label: compact ? `-${Math.round(discountPct)}%` : `${Math.round(discountPct)}% lower right now`,
      className: 'bg-success/15 text-success border-success/25',
      animate: false,
    };
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="inline-flex"
      >
        <Badge
          variant="outline"
          className={`gap-1 text-xs font-semibold ${config.className} ${compact ? 'px-1.5 py-0.5' : 'px-2.5 py-1'}`}
        >
          <motion.span
            animate={config.animate ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.8, repeat: config.animate ? Infinity : 0, repeatDelay: 1 }}
          >
            <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          </motion.span>
          {config.label}
        </Badge>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Full dynamic price display with strikethrough for product detail pages.
 */
export function DynamicPriceDisplay({
  productId,
  currentPrice,
}: {
  productId: string;
  currentPrice: number;
}) {
  const { data: dynamicPrice } = useDynamicPrice(productId);

  if (!dynamicPrice || dynamicPrice.discount <= 0) {
    return (
      <span className="text-2xl font-bold text-foreground">
        {formatINR(currentPrice)}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <motion.span
        className="text-2xl font-bold text-accent"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        key={dynamicPrice.final_price}
      >
        {formatINR(dynamicPrice.final_price)}
      </motion.span>
      <span className="text-base line-through text-muted-foreground">
        {formatINR(dynamicPrice.base_price)}
      </span>
      <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
        Save {formatINR(dynamicPrice.discount)}
      </Badge>
      {dynamicPrice.applied_rules?.length > 0 && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> Limited time
        </span>
      )}
    </div>
  );
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
