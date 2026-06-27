/**
 * Deterministic A/B/n experiment bucketing.
 *
 * - Hashing: FNV-1a 32-bit (small, dependency-free, well-distributed)
 * - Unit: signed-in user id when available, else a stable anon id in localStorage
 * - Sticky: same unit + same experiment id always lands in the same variant
 * - Weights: integer percentages summing to 100 (or normalised on the fly)
 * - Exposure logging: fire-and-forget into `analytics_events`
 *
 * The framework is intentionally client-only and side-effect free until
 * `getVariant()` is called. Experiments are typically configured via env
 * (build-time) or fetched from `system_settings.experiments` at runtime.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ExperimentVariant<V extends string = string> {
  id: V;
  weight: number; // 0..100
}

export interface ExperimentDef<V extends string = string> {
  /** Stable experiment id — also the analytics event property. */
  id: string;
  variants: ExperimentVariant<V>[];
  /** Hard override to force a variant (debug or kill-switch). */
  override?: V | null;
  /** If false, always returns the first variant and skips logging. */
  enabled?: boolean;
}

const ANON_KEY = 'odhra.ab.anon';

function getAnonUnit(): string {
  try {
    let v = localStorage.getItem(ANON_KEY);
    if (!v) {
      v = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ANON_KEY, v);
    }
    return v;
  } catch {
    return 'anon';
  }
}

/** FNV-1a 32-bit. Returns an unsigned int. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function bucketFor<V extends string>(
  unit: string,
  exp: ExperimentDef<V>,
): V {
  const variants = exp.variants;
  if (!variants.length) throw new Error(`[ab] experiment "${exp.id}" has no variants`);
  const totalWeight = variants.reduce((s, v) => s + Math.max(0, v.weight), 0) || variants.length;
  const seed = fnv1a(`${exp.id}:${unit}`);
  const point = (seed % 10_000) / 10_000; // 0..1
  let acc = 0;
  for (const v of variants) {
    acc += Math.max(0, v.weight) / totalWeight;
    if (point < acc) return v.id;
  }
  return variants[variants.length - 1].id;
}

/** Resolve which variant the current visitor should see. */
export function resolveVariant<V extends string>(
  exp: ExperimentDef<V>,
  userId: string | null | undefined,
): V {
  if (exp.enabled === false) return exp.variants[0].id;
  if (exp.override) return exp.override;
  const unit = userId || getAnonUnit();
  return bucketFor(unit, exp);
}

const exposureLogged = new Set<string>();

/** Fire-and-forget exposure event — at most once per (experiment, variant) per session. */
export function logExposure(experimentId: string, variant: string, userId: string | null | undefined) {
  const key = `${experimentId}:${variant}`;
  if (exposureLogged.has(key)) return;
  exposureLogged.add(key);
  try {
    const sessionId = (() => {
      try {
        const k = 'odhra.session.id';
        let v = sessionStorage.getItem(k);
        if (!v) {
          v = crypto.randomUUID?.() ?? `${Date.now()}`;
          sessionStorage.setItem(k, v);
        }
        return v;
      } catch { return 'anon'; }
    })();
    void supabase.from('analytics_events').insert({
      event_type: 'experiment_exposure',
      session_id: sessionId,
      user_id: userId ?? null,
      properties: { experiment_id: experimentId, variant } as never,
    });
  } catch { /* never throw from telemetry */ }
}
