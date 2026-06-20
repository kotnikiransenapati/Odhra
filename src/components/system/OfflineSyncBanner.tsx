/**
 * Batch J3 — Offline / Sync status banner.
 *
 * Mounts once at the app shell. Observes navigator online state plus the
 * existing offline mutation queue and surfaces three states:
 *   - offline: red banner, "You're offline — actions will sync when reconnected"
 *   - syncing: amber banner with spinner, "Syncing X pending actions…"
 *   - synced (toast): brief green confirmation when queue drains
 *
 * Uses semantic tokens only (`destructive`, `warning`, `success`).
 * Honours safe-area-inset for native shells.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, CloudUpload, CheckCircle2 } from 'lucide-react';
import { getPendingActions } from '@/lib/offlineQueue';
import { cn } from '@/lib/utils';

type Status = 'online' | 'offline' | 'syncing' | 'just-synced';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 30 };

export function OfflineSyncBanner({ className }: { className?: string }) {
  const [status, setStatus] = useState<Status>(typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let mounted = true;
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    const refresh = async () => {
      try {
        const queue = await getPendingActions();
        if (!mounted) return;
        const count = queue.length;
        setPending(count);
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setStatus('offline');
        } else if (count > 0) {
          setStatus('syncing');
        } else {
          setStatus((prev) => {
            if (prev === 'syncing' || prev === 'offline') {
              if (toastTimer) clearTimeout(toastTimer);
              toastTimer = setTimeout(() => mounted && setStatus('online'), 2200);
              return 'just-synced';
            }
            return 'online';
          });
        }
      } catch {
        /* swallow */
      }
    };

    const onOnline = () => void refresh();
    const onOffline = () => mounted && setStatus('offline');

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const interval = window.setInterval(refresh, 4000);
    void refresh();

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(interval);
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  const visible = status !== 'online';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={status}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={SPRING}
          role="status"
          aria-live="polite"
          className={cn(
            'fixed left-0 right-0 top-0 z-[80] px-3 pt-[env(safe-area-inset-top)]',
            className,
          )}
        >
          <div
            className={cn(
              'mx-auto mt-2 flex max-w-md items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur',
              status === 'offline' && 'border-destructive/40 bg-destructive/10 text-destructive',
              status === 'syncing' && 'border-warning/40 bg-warning/10 text-warning-foreground',
              status === 'just-synced' && 'border-success/40 bg-success/10 text-success-foreground',
            )}
          >
            {status === 'offline' && <CloudOff className="h-4 w-4 shrink-0" />}
            {status === 'syncing' && <CloudUpload className="h-4 w-4 shrink-0 animate-pulse" />}
            {status === 'just-synced' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="truncate">
              {status === 'offline' && "You're offline — changes will sync when reconnected"}
              {status === 'syncing' && `Syncing ${pending} pending change${pending === 1 ? '' : 's'}…`}
              {status === 'just-synced' && 'All changes synced'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OfflineSyncBanner;
