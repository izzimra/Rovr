"use client";

/**
 * Map_View - interactive Mapbox GL JS map for Rovr.
 *
 * Renders ranked customers as numbered tier-colored markers and, when
 * `showRoute` is true, draws a polyline connecting them in `routeOrder`.
 * The map centers on the browser's geolocation when available; otherwise
 * it falls back to the first customer, then to central KL.
 *
 * mapbox-gl is loaded lazily through `getMapboxGL()` so the heavy bundle
 * is kept out of the server payload and initialization errors (missing
 * token, network failure) degrade gracefully into an inline message.
 *
 * A ResizeObserver fires `map.resize()` whenever the container's box
 * size changes. This fixes the common "invisible map" issue where the
 * map initializes before the parent layout is laid out.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import type { RankedCustomer, PriorityTier } from "../../types/customer";
import { getMapboxGL, hasMapboxToken } from "../../lib/maps/mapbox-client";

import "mapbox-gl/dist/mapbox-gl.css";

export interface RouteMapProps {
  customers: RankedCustomer[];
  /** Ordered customer ids that define the polyline when `showRoute` is true. */
  routeOrder: string[];
  showRoute: boolean;
  /** Optional custom className for the outer container. */
  className?: string;
}

const KL_CENTER: [number, number] = [101.6869, 3.139];
const ROUTE_SOURCE_ID = "rovr-route";
const ROUTE_LAYER_ID = "rovr-route-line";

const TIER_COLORS: Record<PriorityTier, string> = {
  High: "#a78bfa", // violet-400
  Medium: "#60a5fa", // blue-400
  Low: "#71717a", // zinc-500
};

export default function RouteMap({
  customers,
  routeOrder,
  showRoute,
  className,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Precompute an id -> customer map for polyline lookup.
  const customersById = useMemo(() => {
    const map = new Map<string, RankedCustomer>();
    for (const c of customers) {
      if (c.id) map.set(c.id, c);
    }
    return map;
  }, [customers]);

  // -------------------------------------------------------------------
  // Initialize map once
  // -------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    if (!hasMapboxToken()) {
      setStatus("error");
      setErrorMessage(
        "Mapbox token is missing. Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local.",
      );
      return;
    }

    const initMap = async () => {
      try {
        const mapboxgl = await getMapboxGL();
        if (cancelled || !containerRef.current) return;

        // Wait for the container to have non-zero dimensions. The parent
        // uses absolute positioning and framer-motion transitions, which
        // occasionally lays out at 0x0 for one frame. Mapbox initialized
        // against a 0x0 element renders invisible and never recovers on
        // its own — we'd rather wait a tick than hit that bug.
        await waitForContainerSize(containerRef.current);
        if (cancelled || !containerRef.current) return;

        const initialCenter = pickInitialCenter(customers);

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: initialCenter,
          zoom: 10.5,
          attributionControl: false,
        });

        map.addControl(
          new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }),
          "top-right",
        );
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

        map.on("load", () => {
          if (cancelled) return;
          mapRef.current = map;
          setStatus("ready");
          // Kick a resize on the next frame — defends against the parent
          // laying out after the map initializes.
          requestAnimationFrame(() => {
            try {
              map.resize();
            } catch {
              /* noop */
            }
          });
        });

        map.on("error", (e) => {
          if (cancelled) return;
          const message = e?.error?.message ?? "Map failed to load.";
          // Don't mask a ready map with an error overlay — Mapbox fires
          // transient "error" events for missing sprites etc. Only mark
          // the map as errored if it never loaded.
          if (!mapRef.current) {
            setStatus("error");
            setErrorMessage(message);
          } else if (typeof console !== "undefined") {
            console.warn("[Mapbox] transient error:", message);
          }
        });

        // Ensure the canvas keeps pace with container size changes.
        if (typeof ResizeObserver !== "undefined" && containerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            try {
              map.resize();
            } catch {
              /* noop */
            }
          });
          resizeObserver.observe(containerRef.current);
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load Mapbox.");
      }
    };

    void initMap();

    return () => {
      cancelled = true;
      if (resizeObserver) resizeObserver.disconnect();
      clearMarkers();
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* noop */
        }
        mapRef.current = null;
      }
    };
    // Mount-only; subsequent customer changes are handled in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------
  // Render markers whenever customers change
  // -------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;

    let cancelled = false;

    (async () => {
      const mapboxgl = await getMapboxGL();
      if (cancelled) return;

      clearMarkers();

      customers.forEach((customer, idx) => {
        const el = buildMarkerElement(idx + 1, customer.tier);
        const popup = new mapboxgl.Popup({ offset: 18, closeButton: true }).setHTML(
          buildPopupHtml(customer),
        );
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([customer.longitude, customer.latitude])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });

      fitToCustomers(map, customers);
    })();

    return () => {
      cancelled = true;
    };
  }, [customers, status]);

  // -------------------------------------------------------------------
  // Draw / hide the route polyline
  // -------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;

    const coordinates: Array<[number, number]> = [];
    if (showRoute) {
      for (const id of routeOrder) {
        const c = customersById.get(id);
        if (c) coordinates.push([c.longitude, c.latitude]);
      }
    }

    const existingSource = map.getSource(ROUTE_SOURCE_ID) as
      | { setData: (d: GeoJSON.Feature) => void }
      | undefined;

    const feature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    };

    if (coordinates.length < 2) {
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
      return;
    }

    if (existingSource) {
      existingSource.setData(feature);
    } else {
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: feature });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#8b5cf6",
          "line-width": 3.5,
          "line-opacity": 0.9,
        },
      });
    }
  }, [showRoute, routeOrder, customersById, status]);

  function clearMarkers() {
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: 240 }}
      />
      {status === "loading" && <Overlay>Loading map…</Overlay>}
      {status === "error" && (
        <Overlay>
          <strong>Map unavailable.</strong>
          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>
            {errorMessage}
          </div>
        </Overlay>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Container sizing
// ---------------------------------------------------------------------------

/**
 * Resolve once the given element has a non-zero rendered size.
 *
 * Uses ResizeObserver to avoid busy-polling. Falls back to a short
 * timeout on browsers that missed the update (very rare).
 */
function waitForContainerSize(el: HTMLElement): Promise<void> {
  return new Promise<void>((resolve) => {
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    };
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) finish();
    });
    observer.observe(el);
    const timer = setTimeout(finish, 500); // hard ceiling
  });
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(17, 24, 39, 0.72)",
        color: "white",
        textAlign: "center",
        padding: 16,
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

function buildMarkerElement(index: number, tier: PriorityTier): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", `Stop ${index}, ${tier} priority`);
  el.style.width = "30px";
  el.style.height = "30px";
  el.style.borderRadius = "50%";
  el.style.background = TIER_COLORS[tier];
  el.style.color = "white";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.font = "600 12px/1 system-ui, sans-serif";
  el.style.border = "2px solid rgba(255,255,255,0.95)";
  el.style.boxShadow = "0 0 0 4px rgba(139, 92, 246, 0.18), 0 4px 12px rgba(0,0,0,0.5)";
  el.style.cursor = "pointer";
  el.textContent = String(index);
  return el;
}

function buildPopupHtml(c: RankedCustomer): string {
  const name = escapeHtml(c.customer_name);
  const sales = formatCurrency(c.sales_value);
  return `
    <div style="font: 13px/1.4 system-ui, sans-serif; min-width: 200px;">
      <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${name}</div>
      <div><span style="opacity:0.7;">Sales value:</span> ${sales}</div>
      <div><span style="opacity:0.7;">Priority:</span> ${c.priority}/10</div>
      <div><span style="opacity:0.7;">Potential:</span> ${Math.round(c.potential_score)}/100</div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `RM ${Math.round(value).toLocaleString("en-US")}`;
}

// ---------------------------------------------------------------------------
// Initial center
// ---------------------------------------------------------------------------

/**
 * Pick an initial center synchronously so the map can mount with the
 * right viewport even before geolocation resolves. We used to await the
 * browser's geolocation prompt here; that delayed map creation by up to
 * 4 seconds and created the "empty canvas" problem we keep hitting.
 * Default to the first customer or central KL — either way, the markers
 * will trigger a fitBounds once they're added.
 */
function pickInitialCenter(customers: RankedCustomer[]): [number, number] {
  const first = customers[0];
  if (first) return [first.longitude, first.latitude];
  return KL_CENTER;
}

function fitToCustomers(map: MapboxMap, customers: RankedCustomer[]) {
  if (customers.length === 0) return;
  if (customers.length === 1) {
    const only = customers[0];
    if (!only) return;
    map.easeTo({ center: [only.longitude, only.latitude], zoom: 13, duration: 400 });
    return;
  }
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const c of customers) {
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
  }
  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    { padding: 60, duration: 500, maxZoom: 13 },
  );
}
