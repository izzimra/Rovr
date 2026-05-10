"use client";

/**
 * MapShell
 *
 * Center panel of the Rovr dashboard. Renders a dark, premium container
 * that will host the Mapbox GL JS canvas. Per Requirement 7 and the
 * architectural boundary in Requirement 9.4, this component must NOT
 * import or initialize Mapbox GL JS, the Directions API, or the Matrix
 * API — the maps teammate will mount their renderer into the bounded
 * region flagged by `data-rovr-map-slot`.
 *
 * Visual grammar:
 *   - Base shell: `bg-zinc-900 border-white/10 rounded-xl`, with a soft
 *     grid backdrop so the empty state still reads as "a map".
 *   - Floating glass header overlay with route totals.
 *   - Floating glass control stack (zoom in / out / recenter) on the right.
 *   - Bottom attribution / origin chip on the left.
 */

import { Layers, Minus, Navigation, Plus } from "lucide-react";
import { motion } from "framer-motion";

/** Mock route stats — swap for `useRouteStore((s) => s.route)` when wired. */
const MOCK_ROUTE_STATS = {
  originLabel: "Subang Depot",
  stopCount: 12,
  totalDistanceKm: 58.4,
  totalDurationMinutes: 143,
} as const;

export function MapShell() {
  return (
    <div
      className="
        relative h-full w-full overflow-hidden rounded-xl
        border border-white/10 bg-zinc-900
      "
    >
      {/* Subtle grid backdrop — reads as "map" before Mapbox mounts. */}
      <MapBackdrop />

      {/*
        Bounded region where Mapbox GL JS will be mounted by the maps
        teammate. Flagged with `data-rovr-map-slot` per Requirement 7.9.
      */}
      <div
        data-rovr-map-slot
        className="absolute inset-0"
        aria-label="Map viewport"
      />

      {/* Floating header overlay — glassmorphism */}
      <RouteHeader />

      {/* Floating control stack */}
      <MapControls />

      {/* Origin chip */}
      <OriginChip label={MOCK_ROUTE_STATS.originLabel} />
    </div>
  );
}

/* ─── Backdrop ──────────────────────────────────────────────────── */

/**
 * Dark radial + line-grid backdrop. Pure CSS, no SVG assets. Gives the
 * shell a "map canvas" feel before Mapbox mounts, and disappears behind
 * the real tiles once it does.
 */
function MapBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="
        pointer-events-none absolute inset-0
        bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.06),transparent_60%)]
      "
    >
      <div
        className="
          absolute inset-0 opacity-[0.35]
          [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]
          [background-size:48px_48px]
        "
      />
      {/* Edge vignette so the grid fades into the zinc surface. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(9,9,11,0.85)_100%)]" />
    </div>
  );
}

/* ─── Header overlay ────────────────────────────────────────────── */

function RouteHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="
        absolute left-4 right-4 top-4 z-10
        flex items-center justify-between gap-4
        rounded-xl border border-white/10 bg-black/40 px-4 py-3
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
            Today's plan · Klang Valley
          </span>
        </div>
      </div>

      <div className="flex items-center divide-x divide-white/5">
        <StatPill
          label="Stops"
          value={String(MOCK_ROUTE_STATS.stopCount)}
        />
        <StatPill
          label="Distance"
          value={`${MOCK_ROUTE_STATS.totalDistanceKm.toFixed(1)} km`}
        />
        <StatPill
          label="Duration"
          value={formatMinutes(MOCK_ROUTE_STATS.totalDurationMinutes)}
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

/* ─── Control stack ─────────────────────────────────────────────── */

function MapControls() {
  return (
    <div
      className="
        absolute right-4 top-24 z-10 flex flex-col
        overflow-hidden rounded-xl border border-white/10
        bg-black/40 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.6)] backdrop-blur-xl
      "
    >
      <ControlButton label="Zoom in">
        <Plus className="h-4 w-4" strokeWidth={2.25} />
      </ControlButton>
      <div className="h-px bg-white/5" />
      <ControlButton label="Zoom out">
        <Minus className="h-4 w-4" strokeWidth={2.25} />
      </ControlButton>
      <div className="h-px bg-white/5" />
      <ControlButton label="Toggle layers">
        <Layers className="h-4 w-4" strokeWidth={2.25} />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="
        flex h-9 w-9 cursor-pointer items-center justify-center
        text-zinc-300 transition-colors duration-200
        hover:bg-white/5 hover:text-blue-300
        focus:outline-none focus-visible:bg-white/5 focus-visible:text-blue-300
      "
    >
      {children}
    </button>
  );
}

/* ─── Origin chip ───────────────────────────────────────────────── */

function OriginChip({ label }: { label: string }) {
  return (
    <div
      className="
        absolute bottom-4 left-4 z-10
        flex items-center gap-2 rounded-full
        border border-white/10 bg-black/40 px-3 py-1.5
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

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export default MapShell;
