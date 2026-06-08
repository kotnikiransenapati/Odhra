import React from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useIsInWishlist, useToggleWishlist } from '@/hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface WishlistButtonProps {
  productId: string;
  productTitle?: string;
  variant?: 'icon' | 'default';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

export function WishlistButton({
  productId,
  productTitle = 'item',
  variant = 'icon',
  size = 'icon',
  className,
}: WishlistButtonProps) {
  const { isEnabled } = useFeatureFlag('wishlist');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: isInWishlist, isLoading } = useIsInWishlist(productId);
  const { toggle, isPending } = useToggleWishlist();
  if (!isEnabled) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/auth');
      return;
    }

    await toggle(productId, isInWishlist || false);
  };

  const loading = isLoading || isPending;

  const ariaLabel = isInWishlist 
    ? `Remove ${productTitle} from wishlist` 
    : `Add ${productTitle} to wishlist`;

  if (variant === 'icon') {
    return (
      <Button
        variant="secondary"
        size={size}
        onClick={handleClick}
        disabled={loading}
        aria-label={ariaLabel}
        aria-pressed={isInWishlist || false}
        className={cn(
          'rounded-full bg-background/80 backdrop-blur-sm hover:bg-background min-w-[44px] min-h-[44px]',
          isInWishlist && 'text-destructive',
          className
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Heart
            className={cn('w-4 h-4', isInWishlist && 'fill-current')}
            aria-hidden="true"
          />
        )}
        <span className="sr-only">{ariaLabel}</span>
      </Button>
    );
  }

  return (
    <Button
      variant={isInWishlist ? 'destructive' : 'outline'}
      size={size}
      onClick={handleClick}
      disabled={loading}
      aria-label={ariaLabel}
      aria-pressed={isInWishlist || false}
      className={cn('gap-2 min-h-[44px]', className)}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <Heart className={cn('w-4 h-4', isInWishlist && 'fill-current')} aria-hidden="true" />
      )}
      {isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
    </Button>
  );
}
