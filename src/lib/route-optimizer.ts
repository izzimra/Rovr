/**
 * Route_Optimizer — nearest-neighbor routing over a live travel matrix.
 *
 * Given a ranked set of customers and an origin, this produces an
 * `OptimizedRoute` by:
 *   1. Requesting a pairwise travel-time matrix from the Mapbox Matrix API
 *      (via `getDistanceMatrix`). When the Mapbox token is missing or the
 *      API errors, the matrix helper transparently falls back to a
 *      haversine-based mock so this function still returns a usable route.
 *   2. Walking the matrix greedily from the origin, always picking the
 *      unvisited stop with the shortest travel duration (nearest-neighbor).
 *   3. Assembling `RouteStop`s with per-leg distance/duration and
 *      aggregating totals.
 *
 * Tie-breaking is deterministic (earliest input index wins) so repeated
 * runs with the same input always produce the same route — important for
 * predictable Demo_Mode behaviour.
 */

import type { RankedCustomer } from "../types/customer";
import type {
  MapboxTravelMatrix,
  OptimizedRoute,
  RouteStop,
} from "../types/route";
import { getDistanceMatrix, type MatrixPoint } from "./maps/matrix";

/** Origin shape accepted by `optimizeRoute`. Matches the Route_Optimizer spec. */
export interface RouteOrigin {
  lat: number;
  lng: number;
  label: string;
}

export interface OptimizeRouteOptions {
  /** Maximum stops to include. Defaults to all customers. */
  maxStops?: number;
  /** Travel profile forwarded to the Matrix API. */
  profile?: "driving" | "driving-traffic" | "walking" | "cycling";
  signal?: AbortSignal;
}

/**
 * Build an optimized visit order from a list of ranked customers.
 *
 * The function never throws on Mapbox failures — the matrix helper will
 * return a deterministic haversine mock, and this function will route
 * through it. An empty customer list yields an empty route.
 */
export async function optimizeRoute(
  customers: RankedCustomer[],
  origin: RouteOrigin,
  options: OptimizeRouteOptions = {},
): Promise<OptimizedRoute> {
  const cap = Math.max(0, options.maxStops ?? customers.length);
  const candidates = customers.slice(0, cap);

  if (candidates.length === 0) {
    return {
      stops: [],
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      originLabel: origin.label,
    };
  }

  // Build the full point set: origin at index 0, then each candidate.
  const points: MatrixPoint[] = [
    { latitude: origin.lat, longitude: origin.lng, label: origin.label },
    ...candidates.map((c) => ({
      latitude: c.latitude,
      longitude: c.longitude,
      label: c.customer_name,
    })),
  ];

  const matrix = await getDistanceMatrix(points, points, {
    profile: options.profile,
    signal: options.signal,
  });

  const order = nearestNeighborOrder(matrix, candidates.length);

  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;
  let prevIdx = 0; // start at origin

  const stops: RouteStop[] = order.map((customerIdx, stopIdx) => {
    const matrixFromIdx = prevIdx;
    const matrixToIdx = customerIdx + 1; // +1 because origin occupies index 0
    const legMeters = readCell(matrix.distancesMeters, matrixFromIdx, matrixToIdx);
    const legSeconds = readCell(matrix.durationsSeconds, matrixFromIdx, matrixToIdx);
    const legDistanceKm = round1(legMeters / 1000);
    const legDurationMinutes = Math.round(legSeconds / 60);

    totalDistanceKm += legDistanceKm;
    totalDurationMinutes += legDurationMinutes;
    prevIdx = matrixToIdx;

    const customer = candidates[customerIdx];
    if (!customer) {
      // Defensive: the nearest-neighbor walker only returns valid indices,
      // but `noUncheckedIndexedAccess` wants this guard.
      throw new Error(`optimizeRoute: missing customer at index ${customerIdx}`);
    }

    return {
      order: stopIdx + 1,
      customer,
      legDistanceKm,
      legDurationMinutes,
    };
  });

  return {
    stops,
    totalDistanceKm: round1(totalDistanceKm),
    totalDurationMinutes,
    originLabel: origin.label,
    travelMatrix: matrix,
  };
}

// ---------------------------------------------------------------------------
// Nearest-neighbor walk
// ---------------------------------------------------------------------------

/**
 * Greedy nearest-neighbor traversal of a square travel-duration matrix.
 *
 * The matrix is indexed as `[origin, customer_0, customer_1, ...]` so the
 * walk starts at row 0 and picks the column with the smallest duration
 * among unvisited customer indices. Returns indices back into the
 * customer array (0-based), not into the matrix.
 *
 * Deterministic: when two candidates have identical durations, the one
 * with the lower customer index wins.
 */
function nearestNeighborOrder(
  matrix: MapboxTravelMatrix,
  customerCount: number,
): number[] {
  const visited = new Array<boolean>(customerCount).fill(false);
  const order: number[] = [];
  let cursorMatrixIdx = 0; // origin

  for (let step = 0; step < customerCount; step++) {
    let bestCustomerIdx = -1;
    let bestDuration = Number.POSITIVE_INFINITY;

    for (let c = 0; c < customerCount; c++) {
      if (visited[c]) continue;
      const duration = readCell(matrix.durationsSeconds, cursorMatrixIdx, c + 1);
      if (duration < bestDuration) {
        bestDuration = duration;
        bestCustomerIdx = c;
      }
    }

    if (bestCustomerIdx === -1) break; // shouldn't happen; guard anyway
    visited[bestCustomerIdx] = true;
    order.push(bestCustomerIdx);
    cursorMatrixIdx = bestCustomerIdx + 1;
  }

  return order;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readCell(matrix: number[][], row: number, col: number): number {
  const r = matrix[row];
  if (!r) return 0;
  const v = r[col];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
