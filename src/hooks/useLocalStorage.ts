import { useCallback, useEffect, useState } from 'react';

/**
 * Tiny typed wrapper around localStorage with SSR safety, schema-safe parsing,
 * and cross-tab sync via the `storage` event.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const read = useCallback((): T => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  }, [key, initial]);

  const [value, setValue] = useState<T>(read);

  // Persist on change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota / private mode — silently ignore
    }
  }, [key, value]);

  // Cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(JSON.parse(e.newValue) as T);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  return [value, setValue] as const;
}
