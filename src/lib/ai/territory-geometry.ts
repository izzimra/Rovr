/**
 * Territory geometry.
 *
 * Converts the AI territory clusters from `context.ts` into GeoJSON-ready
 * polygons for Mapbox rendering:
 *   - 3+ customers: convex hull inflated outward from the centroid so the
 *     polygon hugs the cluster's perimeter without touching the points.
 *   - 2 customers:  axis-aligned buffered bounding box.
 *   - 1 customer:   a small square centered on the single point.
 *
 * Also exports a hand-curated `STATIC_TERRITORY_POLYGONS` set covering the
 * Klang Valley bands from `context.ts` so the Territories page always has
 * something to render even before the customer store is hydrated.
 */

import type { RankedCustomer } from "../../types/customer";
import { classifyTerritory, type Territory } from "./context";

export interface TerritoryPolygon {
  name: Territory;
  /** Closed GeoJSON ring: array of [longitude, latitude] pairs, first === last. */
  coordinates: Array<[number, number]>;
  /** [longitude, latitude] centroid used for map labels and fly-to. */
  centroid: [number, number];
  count: number;
  totalValue: number;
  highTierCount: number;
}

const PAD_LNG = 0.014; // ~1.5 km
const PAD_LAT = 0.012;

/** Compute a TerritoryPolygon per occupied territory from a customer list. */
export function computeTerritoryPolygons(
  customers: RankedCustomer[],
): TerritoryPolygon[] {
  if (customers.length === 0) return [];

  const byTerritory = new Map<Territory, RankedCustomer[]>();
  for (const c of customers) {
    const name = classifyTerritory(c.latitude, c.longitude);
    const bucket = byTerritory.get(name) ?? [];
    bucket.push(c);
    byTerritory.set(name, bucket);
  }

  const polygons: TerritoryPolygon[] = [];
  for (const [name, cluster] of byTerritory.entries()) {
    const pts: Array<[number, number]> = cluster.map((c) => [
      c.longitude,
      c.latitude,
    ]);

    let ring: Array<[number, number]>;
    if (pts.length >= 3) {
      const hull = convexHull(pts);
      ring = inflateRing(hull, PAD_LNG, PAD_LAT);
    } else {
      ring = bufferedBox(pts, PAD_LNG * 1.6, PAD_LAT * 1.6);
    }
    ring = closeRing(ring);

    const centroid = ringCentroid(ring);
    const totalValue = cluster.reduce((s, c) => s + c.sales_value, 0);
    const highTierCount = cluster.filter((c) => c.tier === "High").length;

    polygons.push({
      name,
      coordinates: ring,
      centroid,
      count: cluster.length,
      totalValue,
      highTierCount,
    });
  }

  polygons.sort((a, b) => b.totalValue - a.totalValue);
  return polygons;
}

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------

/**
 * Predefined rectangles that match the territory bands in `context.ts`.
 * Shown on the Territories page whenever `computeTerritoryPolygons()`
 * returns empty — the page never looks broken.
 */
export const STATIC_TERRITORY_POLYGONS: TerritoryPolygon[] = [
  buildStaticRect("KLCC", 101.7, 101.73, 3.14, 3.18),
  buildStaticRect("Bangsar", 101.66, 101.7, 3.1, 3.14),
  buildStaticRect("Damansara", 101.6, 101.67, 3.14, 3.2),
  buildStaticRect("Petaling Jaya", 101.6, 101.66, 3.08, 3.14),
  buildStaticRect("Subang", 101.53, 101.62, 3.06, 3.14),
  buildStaticRect("Shah Alam", 101.45, 101.56, 3.02, 3.12),
  buildStaticRect("Bangi/Kajang", 101.72, 101.82, 2.88, 3.02),
  buildStaticRect("Puchong", 101.6, 101.65, 2.99, 3.08),
];

function buildStaticRect(
  name: Territory,
  lngMin: number,
  lngMax: number,
  latMin: number,
  latMax: number,
): TerritoryPolygon {
  const ring: Array<[number, number]> = [
    [lngMin, latMin],
    [lngMax, latMin],
    [lngMax, latMax],
    [lngMin, latMax],
    [lngMin, latMin],
  ];
  return {
    name,
    coordinates: ring,
    centroid: [(lngMin + lngMax) / 2, (latMin + latMax) / 2],
    count: 0,
    totalValue: 0,
    highTierCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Andrew's monotone chain convex hull. Returns an OPEN ring. */
function convexHull(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length <= 1) return points.slice();
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const cross = (
    o: [number, number],
    a: [number, number],
    b: [number, number],
  ): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: Array<[number, number]> = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(
        lower[lower.length - 2] as [number, number],
        lower[lower.length - 1] as [number, number],
        p,
      ) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Array<[number, number]> = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i] as [number, number];
    while (
      upper.length >= 2 &&
      cross(
        upper[upper.length - 2] as [number, number],
        upper[upper.length - 1] as [number, number],
        p,
      ) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  // Drop duplicate endpoints.
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Push each vertex outward from the ring's centroid by (padLng, padLat). */
function inflateRing(
  ring: Array<[number, number]>,
  padLng: number,
  padLat: number,
): Array<[number, number]> {
  if (ring.length === 0) return ring;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of ring) {
    cx += x;
    cy += y;
  }
  cx /= ring.length;
  cy /= ring.length;
  return ring.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy);
    if (len === 0) {
      return [x + padLng, y + padLat] as [number, number];
    }
    return [x + (dx / len) * padLng, y + (dy / len) * padLat] as [number, number];
  });
}

/** Axis-aligned bounding box around the given points with outward padding. */
function bufferedBox(
  points: Array<[number, number]>,
  padLng: number,
  padLat: number,
): Array<[number, number]> {
  if (points.length === 0) return [];
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [x, y] of points) {
    if (x < minLng) minLng = x;
    if (x > maxLng) maxLng = x;
    if (y < minLat) minLat = y;
    if (y > maxLat) maxLat = y;
  }
  minLng -= padLng;
  maxLng += padLng;
  minLat -= padLat;
  maxLat += padLat;
  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
  ];
}

/** Ensure the first and last vertex match so the ring is closed. */
function closeRing(
  ring: Array<[number, number]>,
): Array<[number, number]> {
  if (ring.length < 3) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

/** Mean of ring vertices, excluding the duplicate closing vertex. */
function ringCentroid(
  ring: Array<[number, number]>,
): [number, number] {
  if (ring.length === 0) return [101.65, 3.1];
  const uniq =
    ring.length > 1 &&
    ring[0]![0] === ring[ring.length - 1]![0] &&
    ring[0]![1] === ring[ring.length - 1]![1]
      ? ring.slice(0, -1)
      : ring;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of uniq) {
    cx += x;
    cy += y;
  }
  return [cx / uniq.length, cy / uniq.length];
}
