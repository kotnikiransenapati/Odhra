/**
 * Hybrid Recommendation Scorer v2
 *
 * Merges three independent signals into a single ranked list:
 *  1. Co-purchase strength (product_associations) — collaborative signal
 *  2. Category affinity (localStorage decay model) — short-term intent
 *  3. Recently viewed (negative weight) — avoids re-showing seen items
 *
 * Pure functions only. No I/O. Callers feed it candidate rows + signals
 * and receive a deterministic ranking. This keeps the scorer testable and
 * safe to run client-side without leaking server logic.
 */

export interface CandidateProduct {
  id: string;
  category_id?: string | null;
  price?: number | null;
  rating?: number | null;
  rating_count?: number | null;
}

export interface CoPurchaseSignal {
  product_id: string;
  strength: number; // 0..1 (already normalized by RPC / view)
  purchase_count?: number;
}

export interface HybridScoreInput {
  candidate: CandidateProduct;
  coPurchaseStrength: number; // 0..1
  categoryAffinity: number; // 0..1
  recentlyViewed: boolean;
  priceFit: number; // 0..1
}

export interface ScoredCandidate {
  id: string;
  score: number;
  breakdown: {
    coPurchase: number;
    affinity: number;
    quality: number;
    priceFit: number;
    seenPenalty: number;
  };
}

// Weights sum to 1.0 (quality is a bonus on top, capped).
const W_CO_PURCHASE = 0.4;
const W_AFFINITY = 0.3;
const W_PRICE_FIT = 0.15;
const W_QUALITY = 0.15;
const SEEN_PENALTY = 0.35;

function qualityScore(rating?: number | null, count?: number | null): number {
  const r = Math.max(0, Math.min(5, rating ?? 0)) / 5; // 0..1
  // Wilson-ish dampening: needs ≥20 reviews to count fully.
  const confidence = Math.min(1, (count ?? 0) / 20);
  return r * confidence;
}

export function priceFitScore(price: number | null | undefined, range?: { min: number; max: number }): number {
  if (!range || price == null || price <= 0) return 0.5; // neutral
  const { min, max } = range;
  if (max <= min) return 0.5;
  if (price >= min && price <= max) return 1;
  // Soft falloff: 1 unit outside band = score 0.7, 2 units = 0.4, etc.
  const span = max - min;
  const dist = price < min ? min - price : price - max;
  return Math.max(0, 1 - dist / Math.max(span, 1));
}

export function scoreCandidate(input: HybridScoreInput): ScoredCandidate {
  const quality = qualityScore(input.candidate.rating, input.candidate.rating_count);
  const seenPenalty = input.recentlyViewed ? SEEN_PENALTY : 0;

  const raw =
    W_CO_PURCHASE * input.coPurchaseStrength +
    W_AFFINITY * input.categoryAffinity +
    W_PRICE_FIT * input.priceFit +
    W_QUALITY * quality -
    seenPenalty;

  return {
    id: input.candidate.id,
    score: Math.max(0, Math.min(1, raw)),
    breakdown: {
      coPurchase: input.coPurchaseStrength,
      affinity: input.categoryAffinity,
      quality,
      priceFit: input.priceFit,
      seenPenalty,
    },
  };
}

export interface RankInputs {
  candidates: CandidateProduct[];
  coPurchase: CoPurchaseSignal[];
  topCategoryIds: string[]; // ordered desc by affinity
  recentlyViewedIds: string[];
  priceBand?: { min: number; max: number };
}

export function rankHybrid({
  candidates,
  coPurchase,
  topCategoryIds,
  recentlyViewedIds,
  priceBand,
}: RankInputs): ScoredCandidate[] {
  const coMap = new Map(coPurchase.map((c) => [c.product_id, c.strength]));
  const recentSet = new Set(recentlyViewedIds);
  // Decay-weighted affinity per category position: 1, 0.6, 0.36, 0.22, ...
  const catWeight = new Map<string, number>();
  topCategoryIds.forEach((id, i) => catWeight.set(id, Math.pow(0.6, i)));

  return candidates
    .map((c) =>
      scoreCandidate({
        candidate: c,
        coPurchaseStrength: coMap.get(c.id) ?? 0,
        categoryAffinity: catWeight.get(c.category_id ?? "") ?? 0,
        recentlyViewed: recentSet.has(c.id),
        priceFit: priceFitScore(c.price, priceBand),
      })
    )
    .sort((a, b) => b.score - a.score);
}
