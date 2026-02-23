import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncActions } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md text-sm font-medium transition-all',
        isOnline
          ? 'bg-accent/90 text-accent-foreground'
          : 'bg-destructive/90 text-destructive-foreground'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingCount} queued
            </Badge>
          )}
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4" />
          <span>{pendingCount} pending</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={() => syncActions()}
            disabled={isSyncing}
          >
            <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
          </Button>
        </>
      )}
    </div>
  );
}
