import { ReactNode } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import type { ExperimentDef } from '@/lib/ab/experiment';

interface Props<V extends string> {
  experiment: ExperimentDef<V>;
  variants: Record<V, ReactNode>;
  fallback?: ReactNode;
}

/**
 * Render the variant assigned to the current visitor.
 *
 * <Experiment
 *   experiment={{ id: 'home-hero-cta', variants: [
 *     { id: 'a', weight: 50 }, { id: 'b', weight: 50 },
 *   ]}}
 *   variants={{ a: <ShopNowButton />, b: <ExploreButton /> }}
 * />
 */
export function Experiment<V extends string>({ experiment, variants, fallback = null }: Props<V>) {
  const v = useExperiment(experiment);
  return <>{variants[v] ?? fallback}</>;
}

export default Experiment;
