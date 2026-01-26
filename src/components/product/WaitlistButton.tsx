import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWaitlistStatus, useJoinWaitlist, useLeaveWaitlist, useProductWaitlistCount } from '@/hooks/useWaitlist';
import { toast } from 'sonner';

interface WaitlistButtonProps {
  productId: string;
  productTitle: string;
  className?: string;
  showCount?: boolean;
}

export function WaitlistButton({ productId, productTitle, className, showCount = true }: WaitlistButtonProps) {
  const { user } = useAuth();
  const { data: waitlistEntry, isLoading: statusLoading } = useWaitlistStatus(productId);
  const { data: waitlistCount } = useProductWaitlistCount(productId);
  const joinWaitlist = useJoinWaitlist();
  const leaveWaitlist = useLeaveWaitlist();

  const isOnWaitlist = !!waitlistEntry;
  const isLoading = statusLoading || joinWaitlist.isPending || leaveWaitlist.isPending;

  const handleClick = async () => {
    if (!user) {
      toast.error('Please sign in to join the waitlist');
      return;
    }

    if (isOnWaitlist) {
      await leaveWaitlist.mutateAsync(productId);
    } else {
      await joinWaitlist.mutateAsync(productId);
    }
  };

  return (
    <div className={className}>
      <Button
        variant={isOnWaitlist ? "secondary" : "default"}
        onClick={handleClick}
        disabled={isLoading}
        className="w-full gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isOnWaitlist ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {isOnWaitlist ? 'Leave Waitlist' : 'Notify Me When Available'}
      </Button>
      {showCount && waitlistCount && waitlistCount > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {waitlistCount} {waitlistCount === 1 ? 'person is' : 'people are'} waiting for this product
        </p>
      )}
    </div>
  );
}
