/**
 * Mapbox Directions API wrapper.
 *
 * Computes a driving route through an ordered set of waypoints and returns
 * a MapboxRouteGeometry (GeoJSON LineString) plus total distance/duration.
 * Falls back to a straight-line geometry when the Mapbox token is missing
 * or the API request fails — this keeps Map_View and Demo_Mode usable
 * during local development without a live token.
 */

import type { MapboxRouteGeometry } from "../../types/route";
import { getMapboxToken, hasMapboxToken } from "./mapbox-client";

/** Longitude, latitude pair in Mapbox's native order. */
export type Coordinate = { latitude: number; longitude: number };

export interface DirectionsResult {
  geometry: MapboxRouteGeometry;
  /** Total driving distance in meters (Mapbox native unit). */
  distanceMeters: number;
  /** Total driving duration in seconds (Mapbox native unit). */
  durationSeconds: number;
  /** True when the result came from the live Directions API. */
  live: boolean;
}

export interface GetDirectionsOptions {
  /** Travel profile. Defaults to "driving" which is the right default for reps. */
  profile?: "driving" | "driving-traffic" | "walking" | "cycling";
  /** Abort signal forwarded to fetch(). */
  signal?: AbortSignal;
}

const DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";

/**
 * Compute a route from `origin` through `waypoints` ending at `destination`.
 *
 * When the Mapbox token is absent, a mock polyline is returned so the
 * caller can still render something on the map. Mock distance/duration
 * use a coarse straight-line estimate at 40 km/h.
 */
export async function getDirections(
  origin: Coordinate,
  waypoints: Coordinate[],
  destination: Coordinate,
  options: GetDirectionsOptions = {},
): Promise<DirectionsResult> {
  const stops: Coordinate[] = [origin, ...waypoints, destination];

  if (!hasMapboxToken()) {
    return buildMockDirections(stops);
  }

  const profile = options.profile ?? "driving";
  const coords = stops
    .map((s) => `${s.longitude},${s.latitude}`)
    .join(";");
  const url = new URL(`${DIRECTIONS_BASE}/${profile}/${coords}`);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("access_token", getMapboxToken());

  try {
    const response = await fetch(url.toString(), { signal: options.signal });
    if (!response.ok) {
      throw new Error(
        `Mapbox Directions responded ${response.status} ${response.statusText}`,
      );
    }
    const payload = (await response.json()) as MapboxDirectionsResponse;
    const route = payload.routes?.[0];
    if (!route || !route.geometry) {
      throw new Error("Mapbox Directions returned no routes.");
    }
    return {
      geometry: {
        type: "LineString",
        coordinates: route.geometry.coordinates,
      },
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      live: true,
    };
  } catch (err) {
    // Never fail hard — the map should still render something in the
    // absence of a live response. Surface the reason to the console so
    // developers notice configuration issues during local dev.
    if (typeof console !== "undefined") {
      console.warn("[mapbox/directions] falling back to mock geometry:", err);
    }
    return buildMockDirections(stops);
  }
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

const MOCK_DRIVING_KMH = 40;
const EARTH_RADIUS_KM = 6371;

function buildMockDirections(stops: Coordinate[]): DirectionsResult {
  const coordinates: Array<[number, number]> = stops.map((s) => [
    s.longitude,
    s.latitude,
  ]);
  let distanceKm = 0;
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1];
    const next = stops[i];
    if (!prev || !next) continue;
    distanceKm += haversineKm(prev, next);
  }
  const distanceMeters = Math.round(distanceKm * 1000);
  const durationSeconds = Math.round((distanceKm / MOCK_DRIVING_KMH) * 3600);
  return {
    geometry: { type: "LineString", coordinates },
    distanceMeters,
    durationSeconds,
    live: false,
  };
}

function haversineKm(a: Coordinate, b: Coordinate): number {
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

interface MapboxDirectionsResponse {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { type: "LineString"; coordinates: Array<[number, number]> };
  }>;
}
