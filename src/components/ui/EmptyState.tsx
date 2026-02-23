import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ShoppingBag,
  Package,
  Heart,
  Search,
  Star,
  MessageSquare,
  Bell,
  FileText,
  Gift,
  Truck,
  type LucideIcon,
} from 'lucide-react';

type EmptyStatePreset =
  | 'cart'
  | 'orders'
  | 'wishlist'
  | 'search'
  | 'reviews'
  | 'support'
  | 'notifications'
  | 'returns'
  | 'rewards'
  | 'tracking'
  | 'generic';

interface EmptyStateProps {
  preset?: EmptyStatePreset;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

const presets: Record<EmptyStatePreset, { icon: LucideIcon; title: string; description: string; actionLabel: string; actionHref: string }> = {
  cart: {
    icon: ShoppingBag,
    title: 'Your cart is empty',
    description: 'Discover amazing products from 500+ verified vendors.',
    actionLabel: 'Start Shopping',
    actionHref: '/shop',
  },
  orders: {
    icon: Package,
    title: 'No orders yet',
    description: "You haven't placed any orders. Start exploring our collection!",
    actionLabel: 'Browse Products',
    actionHref: '/shop',
  },
  wishlist: {
    icon: Heart,
    title: 'Your wishlist is empty',
    description: 'Save items you love for later by tapping the heart icon.',
    actionLabel: 'Explore Products',
    actionHref: '/shop',
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters to discover amazing products.',
    actionLabel: 'Clear Filters',
    actionHref: '/shop',
  },
  reviews: {
    icon: Star,
    title: 'No reviews yet',
    description: 'Be the first to share your experience with this product!',
    actionLabel: 'Write a Review',
    actionHref: '#',
  },
  support: {
    icon: MessageSquare,
    title: 'No support tickets',
    description: "Need help? We're here for you. Create a ticket to get started.",
    actionLabel: 'Create Ticket',
    actionHref: '/support',
  },
  notifications: {
    icon: Bell,
    title: 'No notifications',
    description: "You're all caught up! We'll notify you when something new happens.",
    actionLabel: 'Go Home',
    actionHref: '/',
  },
  returns: {
    icon: FileText,
    title: 'No return requests',
    description: "You don't have any return or exchange requests.",
    actionLabel: 'View Orders',
    actionHref: '/orders',
  },
  rewards: {
    icon: Gift,
    title: 'No rewards yet',
    description: 'Start shopping to earn loyalty points and unlock exciting rewards!',
    actionLabel: 'Start Earning',
    actionHref: '/shop',
  },
  tracking: {
    icon: Truck,
    title: 'No shipments to track',
    description: 'Order something and track its journey right here.',
    actionLabel: 'Browse Products',
    actionHref: '/shop',
  },
  generic: {
    icon: Package,
    title: 'Nothing here yet',
    description: 'This section is empty. Check back later!',
    actionLabel: 'Go Home',
    actionHref: '/',
  },
};

export function EmptyState({
  preset = 'generic',
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
  onAction,
  className,
  compact = false,
}: EmptyStateProps) {
  const config = presets[preset];
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;
  const displayActionHref = actionHref || config.actionHref;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-4',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className={cn(
          'rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-inner',
          compact ? 'w-16 h-16 mb-4' : 'w-24 h-24 mb-6'
        )}
      >
        <Icon className={cn('text-muted-foreground', compact ? 'w-7 h-7' : 'w-10 h-10')} />
      </motion.div>

      <h3 className={cn('font-bold mb-2', compact ? 'text-lg' : 'text-xl')}>{displayTitle}</h3>
      <p className={cn('text-muted-foreground max-w-sm mx-auto', compact ? 'text-xs mb-4' : 'text-sm mb-6')}>
        {displayDescription}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onAction ? (
          <Button size={compact ? 'sm' : 'default'} onClick={onAction}>
            {displayActionLabel}
          </Button>
        ) : (
          <Button size={compact ? 'sm' : 'default'} asChild>
            <Link to={displayActionHref}>{displayActionLabel}</Link>
          </Button>
        )}
        {secondaryLabel && secondaryHref && (
          <Button size={compact ? 'sm' : 'default'} variant="outline" asChild>
            <Link to={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
