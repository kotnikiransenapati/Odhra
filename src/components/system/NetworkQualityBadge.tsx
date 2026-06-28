import { Wifi, WifiOff, Zap } from 'lucide-react';
import { useNetworkQuality, setManualDataSaver } from '@/hooks/useNetworkQuality';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Floating connection-quality badge. Surfaces:
 *  - Offline state (red)
 *  - Slow / save-data state (amber, click to toggle data-saver)
 * Hidden entirely on healthy 4G+ links to avoid visual noise.
 */
export function NetworkQualityBadge() {
  const { isOnline, effectiveType, shouldConserveData, saveData } = useNetworkQuality();

  if (isOnline && !shouldConserveData) return null;

  const offline = !isOnline;
  const label = offline
    ? 'Offline'
    : effectiveType === 'unknown'
    ? 'Data Saver'
    : `Slow link (${effectiveType.toUpperCase()})`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => !offline && setManualDataSaver(!saveData && !shouldConserveData)}
            aria-label={label}
            className={cn(
              'fixed left-3 bottom-24 z-40 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur transition-colors',
              offline
                ? 'bg-destructive/90 text-destructive-foreground'
                : 'bg-amber-500/90 text-white hover:bg-amber-500'
            )}
          >
            {offline ? <WifiOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
            <span>{label}</span>
            {!offline && <Wifi className="h-3 w-3 opacity-70" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {offline
            ? 'You are offline. Your actions will be saved and synced when you reconnect.'
            : 'Heavy assets are deferred to save mobile data. Click to toggle.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
