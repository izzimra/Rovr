/**
 * Mock route generator.
 *
 * Produces a deterministic OptimizedRoute from a ranked customer list
 * using a nearest-neighbor heuristic. This keeps the Map_View and KPI
 * tiles populated during local development and Demo_Mode without needing
 * a live Mapbox Directions API or Mapbox Matrix API call.
 */

import type { RankedCustomer } from "../../types/customer";
import type { OptimizedRoute, RouteStop } from "../../types/route";
import { DEFAULT_ORIGIN, haversineKm } from "../scoring/calculateScore";

/** Average urban Klang Valley driving speed. Deliberately conservative. */
const URBAN_SPEED_KMH = 28;

export interface MockRouteOptions {
  maxStops?: number;
  origin?: { latitude: number; longitude: number };
  originLabel?: string;
}

export function buildMockRoute(
  customers: RankedCustomer[],
  options: MockRouteOptions = {},
): OptimizedRoute {
  const origin = options.origin ?? DEFAULT_ORIGIN;
  const originLabel = options.originLabel ?? "KL Central (rep origin)";
  const maxStops = Math.min(options.maxStops ?? 10, customers.length);

  const remaining = customers.slice(0, maxStops * 2); // pull from top priority
  const ordered: RankedCustomer[] = [];
  let cursor = origin;

  while (remaining.length > 0 && ordered.length < maxStops) {
    let nearestIdx = 0;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      if (!candidate) continue;
      const dist = haversineKm(cursor, candidate);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0];
    if (!next) break;
    ordered.push(next);
    cursor = { latitude: next.latitude, longitude: next.longitude };
  }

  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;
  let prev = origin;

  const stops: RouteStop[] = ordered.map((customer, idx) => {
    const legKm = haversineKm(prev, customer);
    const legMin = Math.round((legKm / URBAN_SPEED_KMH) * 60);
    totalDistanceKm += legKm;
    totalDurationMinutes += legMin;
    prev = { latitude: customer.latitude, longitude: customer.longitude };
    return {
      order: idx + 1,
      customer,
      legDistanceKm: Math.round(legKm * 10) / 10,
      legDurationMinutes: legMin,
    };
  });

  return {
    stops,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalDurationMinutes,
    originLabel,
  };
}
