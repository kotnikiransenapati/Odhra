import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  enqueueAction,
  getPendingActions,
  removeAction,
  incrementRetry,
  type OfflineAction,
} from '@/lib/offlineQueue';

const MAX_RETRIES = 3;

/**
 * Hook that manages offline action queueing and automatic sync on reconnect.
 * - When offline: mutations are stored in IndexedDB
 * - When online: pending mutations are replayed in FIFO order
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const actions = await getPendingActions();
    setPendingCount(actions.length);
  }, []);

  const syncActions = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const actions = await getPendingActions();
      if (actions.length === 0) return;

      let synced = 0;
      let failed = 0;

      for (const action of actions) {
        if (action.retryCount >= MAX_RETRIES) {
          await removeAction(action.id);
          failed++;
          continue;
        }

        try {
          await executeAction(action);
          await removeAction(action.id);
          synced++;
        } catch {
          await incrementRetry(action.id);
          failed++;
        }
      }

      if (synced > 0) {
        toast.success(`Synced ${synced} offline action${synced > 1 ? 's' : ''}`);
      }
      if (failed > 0) {
        toast.warning(`${failed} action${failed > 1 ? 's' : ''} failed to sync`);
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      refreshCount();
    }
  }, [refreshCount]);

  // Queue a mutation for offline execution
  const queueMutation = useCallback(
    async (params: {
      table: string;
      operation: 'insert' | 'update' | 'delete';
      payload: Record<string, unknown>;
      matchColumn?: string;
      matchValue?: string;
    }) => {
      if (navigator.onLine) {
        // Execute immediately when online
        await executeAction({
          id: '',
          createdAt: Date.now(),
          retryCount: 0,
          ...params,
        });
        return;
      }

      // Queue for later
      await enqueueAction(params);
      refreshCount();
      toast.info('Action saved offline — will sync when connected');
    },
    [refreshCount]
  );

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online!');
      syncActions();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline — actions will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refreshCount();

    // Sync on mount if online
    if (navigator.onLine) syncActions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncActions, refreshCount]);

  return { isOnline, pendingCount, isSyncing, queueMutation, syncActions };
}

async function executeAction(action: OfflineAction) {
  const { table, operation, payload, matchColumn, matchValue } = action;
  // Cast to any to allow dynamic table names from offline queue
  const from = (supabase as any).from(table);

  switch (operation) {
    case 'insert': {
      const { error } = await from.insert(payload);
      if (error) throw error;
      break;
    }
    case 'update': {
      if (!matchColumn || !matchValue) throw new Error('Missing match for update');
      const { error } = await from.update(payload).eq(matchColumn, matchValue);
      if (error) throw error;
      break;
    }
    case 'delete': {
      if (!matchColumn || !matchValue) throw new Error('Missing match for delete');
      const { error } = await from.delete().eq(matchColumn, matchValue);
      if (error) throw error;
      break;
    }
  }
}
