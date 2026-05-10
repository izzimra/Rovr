/**
 * Route and travel optimization types.
 *
 * The Route_Optimizer itself is owned by the maps/infrastructure teammate
 * and is backed by the Mapbox Directions API and Mapbox Matrix API. These
 * types describe the shape the AI layer consumes and emits so downstream
 * services stay decoupled from Mapbox GL JS and the Mapbox_Client.
 *
 * `geometry` carries a Mapbox-style GeoJSON LineString when the
 * Route_Optimizer populates it. The AI layer never decodes it directly —
 * it's threaded through to the Map_View for rendering.
 */

import type { RankedCustomer } from "./customer";

/**
 * GeoJSON LineString geometry as returned by the Mapbox Directions API
 * when the route is requested with `geometries=geojson`.
 */
export interface MapboxRouteGeometry {
  type: "LineString";
  /** Array of [longitude, latitude] pairs along the route. */
  coordinates: Array<[number, number]>;
}

/**
 * Subset of the Mapbox Matrix API response shape that the Route_Optimizer
 * hands down to the AI layer. Rows and columns are indexed by the stop
 * order; units follow Mapbox defaults (duration in seconds, distance in
 * meters) — any km/minute conversion happens at the Route_Optimizer
 * boundary before values land on `OptimizedRoute`.
 */
export interface MapboxTravelMatrix {
  /** Row-major matrix of durations in seconds. */
  durationsSeconds: number[][];
  /** Row-major matrix of distances in meters. */
  distancesMeters: number[][];
  /** Human-readable labels for each row/column index. */
  waypointLabels: string[];
}

export interface RouteStop {
  /** 1-indexed position in the optimized visit order. */
  order: number;
  customer: RankedCustomer;
  /** Travel minutes from the previous stop (0 for the first stop). */
  legDurationMinutes: number;
  /** Travel distance in kilometers from the previous stop. */
  legDistanceKm: number;
}

export interface OptimizedRoute {
  stops: RouteStop[];
  totalDurationMinutes: number;
  totalDistanceKm: number;
  /** Origin the optimizer started from (e.g. rep's home base). */
  originLabel: string;
  /**
   * Optional Mapbox GeoJSON LineString for the full polyline. Populated
   * by the Route_Optimizer when a live Mapbox Directions response is
   * available; undefined for mock/fallback routes.
   */
  geometry?: MapboxRouteGeometry;
  /**
   * Optional Mapbox travel matrix snapshot used by the KPI engine to
   * compute travel-savings baselines without re-querying the API.
   */
  travelMatrix?: MapboxTravelMatrix;
}

export interface RouteInsight {
  headline: string;
  reasoning: string;
  /** Short bullet list: e.g. "Stop 1 is 32% higher value than stop 2". */
  highlights: string[];
}
