/**
 * Lightweight, privacy-preserving affinity tracker.
 * Stores per-category interaction weights in localStorage with exponential decay
 * so recent browsing dominates. Used by the guest "For You" rail and lightweight
 * personalization surfaces. No PII; safe for anonymous users.
 */

const KEY = "odhra_affinity_v1";
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CATEGORIES = 32;

export type AffinityEvent = "view" | "add_to_cart" | "wishlist" | "purchase";

const EVENT_WEIGHT: Record<AffinityEvent, number> = {
  view: 1,
  wishlist: 3,
  add_to_cart: 5,
  purchase: 10,
};

interface AffinityEntry {
  w: number; // weight
  t: number; // last update ts
}
type AffinityMap = Record<string, AffinityEntry>;

function read(): AffinityMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AffinityMap;
  } catch {
    return {};
  }
}

function write(map: AffinityMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota / privacy mode: ignore */
  }
}

function decay(entry: AffinityEntry, now: number): number {
  const elapsed = now - entry.t;
  if (elapsed <= 0) return entry.w;
  // Exponential decay: w * 0.5^(elapsed/half_life)
  return entry.w * Math.pow(0.5, elapsed / HALF_LIFE_MS);
}

export function recordAffinity(categoryId: string | null | undefined, event: AffinityEvent = "view") {
  if (!categoryId) return;
  const now = Date.now();
  const map = read();
  const existing = map[categoryId];
  const decayed = existing ? decay(existing, now) : 0;
  map[categoryId] = { w: decayed + EVENT_WEIGHT[event], t: now };

  // Cap the map size to avoid unbounded growth
  const entries = Object.entries(map);
  if (entries.length > MAX_CATEGORIES) {
    const trimmed = entries
      .map(([id, e]) => [id, { w: decay(e, now), t: e.t }] as const)
      .sort((a, b) => b[1].w - a[1].w)
      .slice(0, MAX_CATEGORIES);
    write(Object.fromEntries(trimmed));
  } else {
    write(map);
  }
}

export function getTopCategories(limit = 4): string[] {
  const now = Date.now();
  return Object.entries(read())
    .map(([id, e]) => ({ id, score: decay(e, now) }))
    .filter((x) => x.score > 0.25) // drop near-zero noise
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.id);
}

export function clearAffinity() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
