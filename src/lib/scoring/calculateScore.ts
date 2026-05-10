/**
 * Deterministic customer scoring.
 *
 * The scoring formula is the system's source-of-truth prioritization heuristic.
 * Gemini's ranking refines this signal, but every customer always has a
 * deterministic score even when the AI layer is offline.
 *
 *   score = (sales_value * 0.4)
 *         + (priority        * 0.3)
 *         + (potential_score * 0.2)
 *         - (distance        * 0.1)
 *
 * Values are normalized to 0–100 scales before weighting so a single
 * large absolute number (e.g. RM 50,000 sales_value) doesn't dominate.
 */

import type { Customer, PriorityTier } from "../../types/customer";

/** Tunable weights; exported so they can be inspected from the UI/tests. */
export const SCORING_WEIGHTS = {
  salesValue: 0.4,
  priority: 0.3,
  potential: 0.2,
  distance: 0.1,
} as const;

/** Sane default used when no origin is supplied. Central KL. */
export const DEFAULT_ORIGIN: { latitude: number; longitude: number } = {
  latitude: 3.139,
  longitude: 101.6869,
};

/** Haversine distance between two WGS84 coordinates, in kilometers. */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

/** Map a numeric `priority` to its display tier. */
export function tierFor(priority: number): PriorityTier {
  if (priority >= 8) return "High";
  if (priority >= 4) return "Medium";
  return "Low";
}

export interface ScoringContext {
  /** Origin used for distance calculations; defaults to central KL. */
  origin?: { latitude: number; longitude: number };
  /** Highest sales_value in the cohort, used for normalization. */
  maxSalesValue: number;
  /** Longest distance in the cohort, used for normalization. */
  maxDistanceKm: number;
}

/** Build the scoring context once per batch of customers. */
export function buildScoringContext(
  customers: Customer[],
  origin = DEFAULT_ORIGIN,
): ScoringContext {
  const maxSalesValue = customers.reduce(
    (acc, c) => Math.max(acc, c.sales_value),
    1,
  );
  const maxDistanceKm = customers.reduce(
    (acc, c) => Math.max(acc, haversineKm(origin, c)),
    1,
  );
  return { origin, maxSalesValue, maxDistanceKm };
}

/**
 * Compute a normalized 0–100 composite score for a single customer.
 * Distance is a penalty so closer customers score higher.
 */
export function calculateScore(customer: Customer, ctx: ScoringContext): number {
  const origin = ctx.origin ?? DEFAULT_ORIGIN;
  const salesScore = normalize(customer.sales_value, ctx.maxSalesValue);
  const priorityScore = normalize(customer.priority, 10);
  const potentialScore = normalize(customer.potential_score, 100);
  const distanceKm = haversineKm(origin, customer);
  const distanceScore = normalize(distanceKm, ctx.maxDistanceKm);

  const raw =
    salesScore * SCORING_WEIGHTS.salesValue +
    priorityScore * SCORING_WEIGHTS.priority +
    potentialScore * SCORING_WEIGHTS.potential -
    distanceScore * SCORING_WEIGHTS.distance;

  // The distance penalty can push the raw value slightly negative in edge
  // cases; clamp to [0, 100] for stable downstream rendering.
  return Math.round(Math.max(0, Math.min(100, raw)) * 100) / 100;
}
