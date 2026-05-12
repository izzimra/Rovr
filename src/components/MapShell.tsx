"use client";

/**
 * MapShell
 *
 * Center panel of the Rovr dashboard. Mounts `RouteMap` (Mapbox GL JS) at
 * the full size of its parent container, then overlays route-summary
 * header + origin chip on top. No absolute-positioned grid backdrops,
 * no nested map slots — RouteMap owns the entire box so Mapbox gets
 * real dimensions the moment the grid lays out.
 *
 * Data flow:
 *   - useCustomerStore.ranked -> markers
 *   - useRouteStore.route    -> polyline + summary stats
 *   - useRouteStore.isOptimizing -> overlay
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Navigation } from "lucide-react";

import RouteMap from "@/components/map/RouteMap";
import { useCustomerStore } from "@/store/customer-store";
import { useRouteStore } from "@/store/route-store";
import type { RankedCustomer } from "@/types/customer";

export function MapShell() {
  const ranked = useCustomerStore((s) => s.ranked);
  const route = useRouteStore((s) => s.route);
  const isOptimizing = useRouteStore((s) => s.isOptimizing);
  const routeError = useRouteStore((s) => s.error);

  // Synthesize stable ids so RouteMap's id-based polyline lookup works.
  const { mapCustomers, routeOrder } = useMemo(() => {
    const withIds: RankedCustomer[] = ranked.map((c) => ({
      ...c,
      id: c.id ?? `rovr_${c.customer_name}`,
    }));
    const order = route?.stops
      .map((s) => {
        const match = withIds.find(
          (c) => c.customer_name === s.customer.customer_name,
        );
        return match?.id ?? `rovr_${s.customer.customer_name}`;
      })
      .filter((id): id is string => Boolean(id)) ?? [];
    return { mapCustomers: withIds, routeOrder: order };
  }, [ranked, route]);

  const showRoute = !!route && route.stops.length > 1;

  return (
    <div className="relative h-full w-full">
      {/* Full-bleed Mapbox canvas. No absolute positioning; RouteMap
          fills its parent via width/height 100%. */}
      <RouteMap
        customers={mapCustomers}
        routeOrder={routeOrder}
        showRoute={showRoute}
      />

      {/* Route summary header (overlay) */}
      <RouteHeader
        stopCount={route?.stops.length ?? 0}
        distanceKm={route?.totalDistanceKm ?? 0}
        durationMin={route?.totalDurationMinutes ?? 0}
      />

      {/* Origin chip (overlay) */}
      <OriginChip label={route?.originLabel ?? "KL Central"} />

      {/* Optimisation overlay */}
      {isOptimizing ? <OptimizingOverlay /> : null}

      {/* Error toast */}
      {routeError ? <RouteErrorBanner message={routeError} /> : null}
    </div>
  );
}

/* ─── Overlays ──────────────────────────────────────────────────── */

function OptimizingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="rounded-xl border border-blue-500/30 bg-black/60 px-5 py-3 text-sm text-blue-200 shadow-[0_0_40px_-12px_rgba(59,130,246,0.6)]">
        Optimising route…
      </div>
    </motion.div>
  );
}

function RouteErrorBanner({ message }: { message: string }) {
  return (
    <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300 backdrop-blur">
      Route error: {message}
    </div>
  );
}

function RouteHeader({
  stopCount,
  distanceKm,
  durationMin,
}: {
  stopCount: number;
  distanceKm: number;
  durationMin: number;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="
        pointer-events-none absolute left-4 right-4 top-4 z-10
        flex items-center justify-between gap-4
        rounded-xl border border-white/10 bg-black/50 px-4 py-3
        shadow-[0_8px_32px_-16px_rgba(0,0,0,0.6)]
        backdrop-blur-xl
      "
    >
      <div className="flex items-center gap-3">
        <div
          className="
            flex h-8 w-8 items-center justify-center rounded-lg
            bg-gradient-to-br from-blue-500/20 to-violet-500/20
            ring-1 ring-inset ring-blue-500/30
          "
          aria-hidden="true"
        >
          <Navigation className="h-4 w-4 text-blue-300" strokeWidth={2.25} />
        </div>

        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Optimized Route Overview
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Today&apos;s plan · Klang Valley
          </span>
        </div>
      </div>

      <div className="flex items-center divide-x divide-white/5">
        <StatPill label="Stops" value={String(stopCount)} />
        <StatPill
          label="Distance"
          value={stopCount ? `${distanceKm.toFixed(1)} km` : "—"}
        />
        <StatPill
          label="Duration"
          value={stopCount ? formatMinutes(durationMin) : "—"}
        />
      </div>
    </motion.header>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5 px-4 leading-none first:pl-0 last:pr-0">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-zinc-100">
        {value}
      </span>
    </div>
  );
}

function OriginChip({ label }: { label: string }) {
  return (
    <div
      className="
        pointer-events-none absolute bottom-4 left-4 z-10
        flex items-center gap-2 rounded-full
        border border-white/10 bg-black/50 px-3 py-1.5
        backdrop-blur-xl
      "
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400/60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
      </span>
      <span className="text-[11px] font-medium tracking-tight text-zinc-300">
        Origin · {label}
      </span>
    </div>
  );
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export default MapShell;
