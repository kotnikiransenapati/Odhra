import React from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useIsInWishlist, useToggleWishlist } from '@/hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  variant?: 'icon' | 'default';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

export function WishlistButton({
  productId,
  variant = 'icon',
  size = 'icon',
  className,
}: WishlistButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: isInWishlist, isLoading } = useIsInWishlist(productId);
  const { toggle, isPending } = useToggleWishlist();

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

  if (variant === 'icon') {
    return (
      <Button
        variant="secondary"
        size={size}
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'rounded-full bg-background/80 backdrop-blur-sm hover:bg-background',
          isInWishlist && 'text-red-500',
          className
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Heart
            className={cn('w-4 h-4', isInWishlist && 'fill-current')}
          />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isInWishlist ? 'destructive' : 'outline'}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={cn('gap-2', className)}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Heart className={cn('w-4 h-4', isInWishlist && 'fill-current')} />
      )}
      {isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
    </Button>
  );
}
