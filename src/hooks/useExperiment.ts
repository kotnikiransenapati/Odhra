import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveVariant, logExposure, type ExperimentDef } from "@/lib/ab/experiment";

const ANON_KEY = "lov_anon_id";

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Client-side deterministic bucketing (legacy API).
 * Used by <Experiment /> with hardcoded variants.
 */
export function useExperiment<V extends string>(exp: ExperimentDef<V>): V {
  const { user } = useAuth();
  const variant = useMemo(() => resolveVariant(exp, user?.id ?? null), [exp, user?.id]);
  useEffect(() => {
    logExposure(exp.id, variant, user?.id ?? null);
  }, [exp.id, variant, user?.id]);
  return variant;
}

/**
 * Server-backed multivariate experiment with weighted assignment.
 * Returns the assigned variant for an experiment configured in the `experiments` table.
 */
export function useServerExperiment(key: string): { variant: string | null; loading: boolean } {
  const [variant, setVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `exp:${key}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setVariant(cached); setLoading(false); return; }
    } catch {}

    (supabase.rpc as any)("assign_experiment_variant", {
      _key: key,
      _anon_id: getAnonId(),
    }).then(({ data, error }: any) => {
      if (cancelled) return;
      if (!error && typeof data === "string") {
        setVariant(data);
        try { sessionStorage.setItem(cacheKey, data); } catch {}
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [key]);

  return { variant, loading };
}

export async function trackExperimentConversion(
  key: string,
  variant: string,
  value?: number,
  metadata?: Record<string, unknown>
) {
  try {
    await (supabase.from as any)("experiment_events").insert({
      experiment_key: key,
      variant,
      event_type: "conversion",
      anonymous_id: getAnonId(),
      value: value ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    console.debug("[experiment] conversion failed", err);
  }
}
