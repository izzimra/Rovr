"use client";

/**
 * Map_View — interactive Mapbox GL JS map for Rovr.
 *
 * Renders ranked customers as numbered tier-colored markers and, when
 * `showRoute` is true, draws a polyline connecting them in `routeOrder`.
 * The map centers on the browser's geolocation when available; otherwise
 * it falls back to the first customer, then to central KL.
 *
 * mapbox-gl is loaded lazily through `getMapboxGL()` so the heavy bundle
 * is kept out of the server payload and initialization errors (missing
 * token, network failure) degrade gracefully into an inline message.
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
  High: "#ef4444", // red-500
  Medium: "#f59e0b", // amber-500
  Low: "#10b981", // emerald-500
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

    if (!hasMapboxToken()) {
      setStatus("error");
      setErrorMessage(
        "Mapbox token is missing. Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local.",
      );
      return;
    }

    (async () => {
      try {
        const mapboxgl = await getMapboxGL();
        if (cancelled || !containerRef.current) return;

        const initialCenter = await resolveInitialCenter(customers);

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: initialCenter,
          zoom: 11,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          if (cancelled) return;
          mapRef.current = map;
          setStatus("ready");
        });

        map.on("error", (e) => {
          if (cancelled) return;
          const message = e?.error?.message ?? "Map failed to load.";
          setStatus("error");
          setErrorMessage(message);
        });
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load Mapbox.");
      }
    })();

    return () => {
      cancelled = true;
      clearMarkers();
      if (mapRef.current) {
        mapRef.current.remove();
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
      // Nothing to draw — remove any previous line.
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
          "line-color": "#2563eb", // blue-600
          "line-width": 4,
          "line-opacity": 0.85,
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
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {status === "loading" && <Overlay>Loading map…</Overlay>}
      {status === "error" && (
        <Overlay>
          <strong>Map unavailable.</strong>
          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>{errorMessage}</div>
        </Overlay>
      )}
    </div>
  );
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
  el.style.width = "28px";
  el.style.height = "28px";
  el.style.borderRadius = "50%";
  el.style.background = TIER_COLORS[tier];
  el.style.color = "white";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.font = "600 12px/1 system-ui, sans-serif";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.25)";
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
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `RM ${Math.round(value).toLocaleString()}`;
  }
}

// ---------------------------------------------------------------------------
// Geolocation / fit helpers
// ---------------------------------------------------------------------------

async function resolveInitialCenter(customers: RankedCustomer[]): Promise<[number, number]> {
  const fromGeo = await tryGeolocate();
  if (fromGeo) return fromGeo;
  const first = customers[0];
  if (first) return [first.longitude, first.latitude];
  return KL_CENTER;
}

function tryGeolocate(): Promise<[number, number] | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve([pos.coords.longitude, pos.coords.latitude]);
      },
      () => {
        clearTimeout(timeout);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 4000 },
    );
  });
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
    { padding: 48, duration: 400, maxZoom: 14 },
  );
}
