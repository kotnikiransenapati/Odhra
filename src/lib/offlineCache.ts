/**
 * Batch J3 — Offline-first cache for read-heavy entities (PDP, listings).
 *
 * Pairs with the existing mutation queue at `src/lib/offlineQueue.ts`:
 *   - offlineQueue.ts → writes (cart, wishlist) replayed on reconnect
 *   - offlineCache.ts → reads (PDPs, search snapshots) served while offline
 *
 * Storage: a dedicated IndexedDB database so cache eviction never disturbs
 * pending mutations. Each entry is namespaced by `scope` and carries a TTL.
 *
 * Security:
 *   - Only public, non-PII payloads should be cached here (products, reviews,
 *     CMS sections). Caller is responsible for honouring this contract.
 *   - Values are JSON-cloned on read/write so cached objects are immutable
 *     from the consumer's perspective.
 */

const DB_NAME = 'odhra-readcache';
const DB_VERSION = 1;
const STORE = 'entries';

interface CacheRecord<T = unknown> {
  key: string;          // `${scope}:${id}`
  scope: string;
  payload: T;
  storedAt: number;
  expiresAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('scope', 'scope', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function makeKey(scope: string, id: string): string {
  return `${scope}:${id}`;
}

export async function cachePut<T>(scope: string, id: string, payload: T, ttlMs = 1000 * 60 * 60 * 6): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDB();
  const record: CacheRecord<T> = {
    key: makeKey(scope, id),
    scope,
    payload: structuredCloneSafe(payload),
    storedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface CachedRead<T> {
  payload: T;
  storedAt: number;
  stale: boolean;
}

export async function cacheGet<T>(scope: string, id: string): Promise<CachedRead<T> | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDB();
  return await new Promise<CachedRead<T> | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(makeKey(scope, id));
    req.onsuccess = () => {
      const r = req.result as CacheRecord<T> | undefined;
      if (!r) return resolve(null);
      resolve({
        payload: structuredCloneSafe(r.payload),
        storedAt: r.storedAt,
        stale: r.expiresAt < Date.now(),
      });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function cacheEvictScope(scope: string): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0;
  const db = await openDB();
  return await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const idx = tx.objectStore(STORE).index('scope');
    const req = idx.openCursor(IDBKeyRange.only(scope));
    let count = 0;
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        cur.delete();
        count++;
        cur.continue();
      } else {
        resolve(count);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function cacheEvictExpired(): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0;
  const db = await openDB();
  return await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const idx = tx.objectStore(STORE).index('expiresAt');
    const req = idx.openCursor(IDBKeyRange.upperBound(Date.now()));
    let count = 0;
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { cur.delete(); count++; cur.continue(); } else { resolve(count); }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Stale-while-revalidate fetcher.
 * Returns cached payload immediately (if any) via `onCached`, while the network
 * fetch resolves with fresh data and writes it back to cache.
 */
export async function swrFetch<T>(
  scope: string,
  id: string,
  fetcher: () => Promise<T>,
  opts: { ttlMs?: number; onCached?: (data: CachedRead<T>) => void } = {},
): Promise<T> {
  const cached = await cacheGet<T>(scope, id);
  if (cached && opts.onCached) opts.onCached(cached);
  try {
    const fresh = await fetcher();
    await cachePut(scope, id, fresh, opts.ttlMs);
    return fresh;
  } catch (err) {
    if (cached) return cached.payload;
    throw err;
  }
}

function structuredCloneSafe<T>(v: T): T {
  try {
    return typeof structuredClone === 'function' ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
  } catch {
    return v;
  }
}
