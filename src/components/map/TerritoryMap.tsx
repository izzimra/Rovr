"use client";

/**
 * TerritoryMap
 *
 * Mapbox GL JS renderer for territory cluster polygons.
 *
 * Takes a set of `TerritoryPolygon` records and paints them as a fill
 * layer + outline layer + centroid-label symbol layer on a dark Mapbox
 * basemap. Clicking a polygon fires `onSelect`; the `selectedName` prop
 * highlights the corresponding polygon and zooms to it.
 *
 * Robustness:
 *  - Waits for the container to have non-zero dimensions before creating
 *    the map (protects against the 0x0 init trap).
 *  - Resize-observes the container and calls `map.resize()` on changes.
 *  - Defers source/layer creation until the `load` event fires.
 *  - Swallows transient Mapbox warnings that would otherwise blank the map.
 */

import { useEffect, useRef, useState } from "react";
import type {
  GeoJSONSource,
  Map as MapboxMap,
  MapMouseEvent,
} from "mapbox-gl";

import { getMapboxGL, hasMapboxToken } from "../../lib/maps/mapbox-client";
import type { TerritoryPolygon } from "../../lib/ai/territory-geometry";
import type { Territory } from "../../lib/ai/context";

import "mapbox-gl/dist/mapbox-gl.css";

export interface TerritoryMapProps {
  polygons: TerritoryPolygon[];
  selectedName: Territory | null;
  onSelect?: (name: Territory) => void;
}

// Per-territory accent color. Aligns loosely with the dashboard palette.
const TERRITORY_COLORS: Record<Territory, string> = {
  KLCC: "#60a5fa",
  Bangsar: "#a78bfa",
  Damansara: "#f472b6",
  "Petaling Jaya": "#34d399",
  Subang: "#fbbf24",
  "Shah Alam": "#fb923c",
  "Bangi/Kajang": "#22d3ee",
  Puchong: "#c084fc",
  "Klang Valley": "#9ca3af",
};

const KL_CENTER: [number, number] = [101.65, 3.1];

const FILL_SOURCE = "rovr-territory-fill";
const FILL_LAYER = "rovr-territory-fill-layer";
const LINE_LAYER = "rovr-territory-line-layer";
const LABEL_SOURCE = "rovr-territory-labels";
const LABEL_LAYER = "rovr-territory-labels-layer";

export default function TerritoryMap({
  polygons,
  selectedName,
  onSelect,
}: TerritoryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const onSelectRef = useRef<typeof onSelect>(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep the latest `onSelect` reference accessible inside map click handlers
  // that are bound on mount only.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // --- Map init (mount-only) ------------------------------------------
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

    (async () => {
      try {
        const mapboxgl = await getMapboxGL();
        if (cancelled || !containerRef.current) return;

        await waitForContainerSize(containerRef.current);
        if (cancelled || !containerRef.current) return;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: KL_CENTER,
          zoom: 9.6,
          attributionControl: false,
        });

        map.addControl(
          new mapboxgl.NavigationControl({
            showCompass: false,
            visualizePitch: false,
          }),
          "top-right",
        );
        map.addControl(
          new mapboxgl.AttributionControl({ compact: true }),
          "bottom-right",
        );

        map.on("load", () => {
          if (cancelled) return;
          mapRef.current = map;
          setStatus("ready");
          requestAnimationFrame(() => {
            try {
              map.resize();
            } catch {
              /* noop */
            }
          });
        });

        map.on("error", (e) => {
          if (!mapRef.current) {
            const message = e?.error?.message ?? "Map failed to load.";
            setStatus("error");
            setErrorMessage(message);
          } else if (typeof console !== "undefined") {
            console.warn("[TerritoryMap] transient error:", e?.error?.message);
          }
        });

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
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load Mapbox.",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* noop */
        }
        mapRef.current = null;
      }
    };
  }, []);

  // --- Render + update polygons --------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;

    const fillFeatures = polygons.map((p) => ({
      type: "Feature" as const,
      properties: {
        name: p.name,
        count: p.count,
        totalValue: p.totalValue,
        highTierCount: p.highTierCount,
        color: TERRITORY_COLORS[p.name] ?? "#60a5fa",
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [p.coordinates],
      },
    }));
    const fillData = {
      type: "FeatureCollection" as const,
      features: fillFeatures,
    };

    const labelFeatures = polygons.map((p) => ({
      type: "Feature" as const,
      properties: {
        label:
          p.count > 0
            ? `${p.name}  ·  ${p.count} ${p.count === 1 ? "acct" : "accts"}`
            : p.name,
      },
      geometry: {
        type: "Point" as const,
        coordinates: p.centroid,
      },
    }));
    const labelData = {
      type: "FeatureCollection" as const,
      features: labelFeatures,
    };

    // Attach sources + layers the first time we paint; subsequent runs
    // reuse them via setData + paint-property updates.
    const fillSource = map.getSource(FILL_SOURCE) as
      | GeoJSONSource
      | undefined;

    if (fillSource) {
      fillSource.setData(fillData);
    } else {
      map.addSource(FILL_SOURCE, { type: "geojson", data: fillData });

      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: FILL_SOURCE,
        paint: {
          "fill-color": ["get", "color"] as unknown as string,
          "fill-opacity": 0.18,
        },
      });

      map.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: FILL_SOURCE,
        paint: {
          "line-color": ["get", "color"] as unknown as string,
          "line-width": 1.5,
          "line-opacity": 0.75,
        },
      });

      map.on("mouseenter", FILL_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", FILL_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", FILL_LAYER, (e: MapMouseEvent) => {
        const feature = (e as unknown as { features?: Array<{ properties?: { name?: string } }> })
          .features?.[0];
        const name = feature?.properties?.name;
        if (name && onSelectRef.current) {
          onSelectRef.current(name as Territory);
        }
      });
    }

    const labelSource = map.getSource(LABEL_SOURCE) as
      | GeoJSONSource
      | undefined;
    if (labelSource) {
      labelSource.setData(labelData);
    } else {
      map.addSource(LABEL_SOURCE, { type: "geojson", data: labelData });
      map.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: LABEL_SOURCE,
        layout: {
          "text-field": ["get", "label"] as unknown as string,
          "text-size": 11,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-letter-spacing": 0.05,
          "text-anchor": "center",
          "text-allow-overlap": false,
          "text-optional": true,
        },
        paint: {
          "text-color": "#e5e7eb",
          "text-halo-color": "#0b0f17",
          "text-halo-width": 1.6,
          "text-halo-blur": 0.5,
        },
      });
    }

    // Update selection paint
    if (map.getLayer(FILL_LAYER)) {
      map.setPaintProperty(FILL_LAYER, "fill-opacity", [
        "case",
        ["==", ["get", "name"], selectedName ?? ""],
        0.38,
        0.15,
      ] as unknown as number);
    }
    if (map.getLayer(LINE_LAYER)) {
      map.setPaintProperty(LINE_LAYER, "line-width", [
        "case",
        ["==", ["get", "name"], selectedName ?? ""],
        3,
        1.5,
      ] as unknown as number);
    }

    // Fit bounds to the full polygon set.
    if (polygons.length > 0 && !selectedName) {
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      for (const p of polygons) {
        for (const [lng, lat] of p.coordinates) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
      if (Number.isFinite(minLng)) {
        try {
          map.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            { padding: 60, duration: 500, maxZoom: 11.2 },
          );
        } catch {
          /* noop */
        }
      }
    }
  }, [polygons, status, selectedName]);

  // --- Fly to selected territory -------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !selectedName) return;
    const selected = polygons.find((p) => p.name === selectedName);
    if (!selected) return;
    try {
      map.flyTo({
        center: selected.centroid,
        zoom: 11.4,
        duration: 600,
      });
    } catch {
      /* noop */
    }
  }, [selectedName, polygons, status]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: 240 }}
      />
      {status === "loading" && <Overlay>Loading territory map…</Overlay>}
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
        background: "rgba(11, 15, 23, 0.72)",
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
    const timer = setTimeout(finish, 500);
  });
}
