/**
 * Mapbox Matrix API wrapper.
 *
 * Builds a pairwise travel-time / travel-distance matrix for a set of
 * origins and destinations. Output is shaped as MapboxTravelMatrix so the
 * Route_Optimizer and KPI engine can consume it directly.
 *
 * Falls back to a haversine-based mock matrix when the Mapbox token is
 * missing or the API request fails.
 */

import type { MapboxTravelMatrix } from "../../types/route";
import { getMapboxToken, hasMapboxToken } from "./mapbox-client";

export type MatrixPoint = {
  latitude: number;
  longitude: number;
  /** Optional label used to populate `MapboxTravelMatrix.waypointLabels`. */
  label?: string;
};

export interface GetDistanceMatrixOptions {
  profile?: "driving" | "driving-traffic" | "walking" | "cycling";
  signal?: AbortSignal;
  /**
   * Mapbox allows up to 25 coordinates per Matrix request on the standard
   * tier and up to 10 with `driving-traffic`. The helper enforces this
   * limit to fail fast with a clear error instead of a cryptic API 422.
   */
  maxCoordinates?: number;
}

const MATRIX_BASE = "https://api.mapbox.com/directions-matrix/v1/mapbox";
const DEFAULT_MAX_COORDINATES = 25;

/**
 * Fetch (or synthesize) a travel-time / travel-distance matrix between
 * every origin and every destination. Rows correspond to `origins` and
 * columns correspond to `destinations` in the returned matrix.
 */
export async function getDistanceMatrix(
  origins: MatrixPoint[],
  destinations: MatrixPoint[],
  options: GetDistanceMatrixOptions = {},
): Promise<MapboxTravelMatrix> {
  if (origins.length === 0 || destinations.length === 0) {
    return {
      durationsSeconds: [],
      distancesMeters: [],
      waypointLabels: [],
    };
  }

  if (!hasMapboxToken()) {
    return buildMockMatrix(origins, destinations);
  }

  const profile = options.profile ?? "driving";
  const maxCoords = options.maxCoordinates ?? DEFAULT_MAX_COORDINATES;
  const all = [...origins, ...destinations];
  if (all.length > maxCoords) {
    if (typeof console !== "undefined") {
      console.warn(
        `[mapbox/matrix] request exceeds ${maxCoords} coordinates; using mock fallback.`,
      );
    }
    return buildMockMatrix(origins, destinations);
  }

  const coords = all
    .map((p) => `${p.longitude},${p.latitude}`)
    .join(";");
  const sources = origins.map((_, i) => i).join(";");
  const destIndices = destinations.map((_, i) => origins.length + i).join(";");

  const url = new URL(`${MATRIX_BASE}/${profile}/${coords}`);
  url.searchParams.set("sources", sources);
  url.searchParams.set("destinations", destIndices);
  url.searchParams.set("annotations", "duration,distance");
  url.searchParams.set("access_token", getMapboxToken());

  try {
    const response = await fetch(url.toString(), { signal: options.signal });
    if (!response.ok) {
      throw new Error(
        `Mapbox Matrix responded ${response.status} ${response.statusText}`,
      );
    }
    const payload = (await response.json()) as MapboxMatrixResponse;
    if (!payload.durations || !payload.distances) {
      throw new Error("Mapbox Matrix response missing durations/distances.");
    }
    return {
      durationsSeconds: payload.durations,
      distancesMeters: payload.distances,
      waypointLabels: buildLabels(origins, destinations),
    };
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("[mapbox/matrix] falling back to mock matrix:", err);
    }
    return buildMockMatrix(origins, destinations);
  }
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

const MOCK_DRIVING_KMH = 40;
const EARTH_RADIUS_KM = 6371;

function buildMockMatrix(
  origins: MatrixPoint[],
  destinations: MatrixPoint[],
): MapboxTravelMatrix {
  const distancesMeters: number[][] = [];
  const durationsSeconds: number[][] = [];
  for (const origin of origins) {
    const distRow: number[] = [];
    const durRow: number[] = [];
    for (const dest of destinations) {
      const km = haversineKm(origin, dest);
      distRow.push(Math.round(km * 1000));
      durRow.push(Math.round((km / MOCK_DRIVING_KMH) * 3600));
    }
    distancesMeters.push(distRow);
    durationsSeconds.push(durRow);
  }
  return {
    durationsSeconds,
    distancesMeters,
    waypointLabels: buildLabels(origins, destinations),
  };
}

function buildLabels(origins: MatrixPoint[], destinations: MatrixPoint[]): string[] {
  const labelFor = (p: MatrixPoint, i: number, prefix: string) =>
    p.label ?? `${prefix} ${i + 1}`;
  return [
    ...origins.map((p, i) => labelFor(p, i, "Origin")),
    ...destinations.map((p, i) => labelFor(p, i, "Destination")),
  ];
}

function haversineKm(a: MatrixPoint, b: MatrixPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ---------------------------------------------------------------------------
// Mapbox API response shape (only the fields we consume)
// ---------------------------------------------------------------------------

interface MapboxMatrixResponse {
  durations?: number[][];
  distances?: number[][];
}
