import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveVariant, logExposure, type ExperimentDef } from '@/lib/ab/experiment';

/**
 * Resolve and log an experiment for the current visitor.
 * Variant assignment is stable across reloads and devices (when signed in).
 */
export function useExperiment<V extends string>(exp: ExperimentDef<V>): V {
  const { user } = useAuth();
  const variant = useMemo(() => resolveVariant(exp, user?.id ?? null), [exp, user?.id]);

  useEffect(() => {
    if (exp.enabled === false) return;
    logExposure(exp.id, variant, user?.id ?? null);
  }, [exp.id, exp.enabled, variant, user?.id]);

  return variant;
}
