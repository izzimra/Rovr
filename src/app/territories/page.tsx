/**
 * Territories page.
 *
 * Left column: live Mapbox territory visualization with polygon overlays
 * computed from the current `useCustomerStore.ranked` list (or static
 * fallback polygons when the store is empty). Right column: active
 * territory list with cards that sync selection with the map.
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Filter,
  Scale,
  Sparkles,
} from "lucide-react";

import TerritoryMap from "@/components/map/TerritoryMap";
import type { Territory } from "@/lib/ai/context";
import {
  computeTerritoryPolygons,
  STATIC_TERRITORY_POLYGONS,
  type TerritoryPolygon,
} from "@/lib/ai/territory-geometry";
import { useCustomerStore } from "@/store/customer-store";

export default function TerritoriesPage() {
  const ranked = useCustomerStore((s) => s.ranked);
  const demoMode = useCustomerStore((s) => s.demoMode);
  const [selected, setSelected] = useState<Territory | null>(null);

  // Compute live polygons from the customer store. Fall back to static
  // Klang Valley bands when the store hasn't hydrated yet so the map
  // never looks empty.
  const polygons = useMemo<TerritoryPolygon[]>(() => {
    const live = computeTerritoryPolygons(ranked);
    return live.length > 0 ? live : STATIC_TERRITORY_POLYGONS;
  }, [ranked]);

  const totalPipeline = polygons.reduce((sum, c) => sum + c.totalValue, 0);
  const totalAccounts = polygons.reduce((sum, c) => sum + c.count, 0);
  const isStaticFallback = polygons === STATIC_TERRITORY_POLYGONS;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 p-6 lg:flex-row">
      <MapCanvas
        polygons={polygons}
        selected={selected}
        onSelect={setSelected}
        demoMode={demoMode}
        isStaticFallback={isStaticFallback}
      />
      <TerritoryRail
        polygons={polygons}
        selected={selected}
        onSelect={setSelected}
        totalPipeline={totalPipeline}
        totalAccounts={totalAccounts}
        isStaticFallback={isStaticFallback}
      />
    </div>
  );
}

/* ─── Map canvas ────────────────────────────────────────────────── */

function MapCanvas({
  polygons,
  selected,
  onSelect,
  demoMode,
  isStaticFallback,
}: {
  polygons: TerritoryPolygon[];
  selected: Territory | null;
  onSelect: (name: Territory) => void;
  demoMode: boolean;
  isStaticFallback: boolean;
}) {
  return (
    <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl border border-outline-variant/10 bg-[#0A0A0B] shadow-2xl">
      <TerritoryMap
        polygons={polygons}
        selectedName={selected}
        onSelect={onSelect}
      />

      {/* Top-right status chip */}
      <div className="pointer-events-none absolute right-6 top-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-xl">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[11px] font-medium text-zinc-200">
          {isStaticFallback
            ? "Preview territories"
            : `${demoMode ? "Demo Mode" : "Live"} · ${polygons.length} active clusters`}
        </span>
      </div>

      {/* Floating AI rebalance card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="
          absolute inset-x-6 bottom-6 z-10
          flex flex-col items-start justify-between gap-4 rounded-xl
          border border-primary/20 bg-black/50 p-6 backdrop-blur-xl
          shadow-ai-glow
          md:flex-row md:items-center
        "
      >
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.25} />
            <h3 className="text-lg font-semibold text-primary">
              AI Rebalancing Available
            </h3>
          </div>
          <p className="text-sm text-on-surface-variant">
            {isStaticFallback
              ? "Activate Demo Mode on the Overview page to unlock cluster-level rebalancing."
              : `Rovr detects uneven load across ${polygons.length} active clusters. Rebalance to redistribute accounts for tighter revenue density.`}
          </p>
        </div>
        <button
          type="button"
          disabled={isStaticFallback}
          className={`
            inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2
            text-sm font-semibold text-on-primary transition-transform
            ${
              isStaticFallback
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:opacity-90 active:scale-95"
            }
          `}
        >
          Preview Recommendation
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </motion.div>
    </div>
  );
}

/* ─── Rail ──────────────────────────────────────────────────────── */

function TerritoryRail({
  polygons,
  selected,
  onSelect,
  totalPipeline,
  totalAccounts,
  isStaticFallback,
}: {
  polygons: TerritoryPolygon[];
  selected: Territory | null;
  onSelect: (name: Territory) => void;
  totalPipeline: number;
  totalAccounts: number;
  isStaticFallback: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-4 overflow-y-auto lg:max-w-[420px]">
      {/* Region overview */}
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#121214]/80 p-4 backdrop-blur-xl">
        <div>
          <h2 className="font-semibold text-on-surface">Region Overview</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            Klang Valley · {totalAccounts} accounts ·{" "}
            {polygons.length} {polygons.length === 1 ? "cluster" : "clusters"}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            Total Pipeline
          </div>
          <div className="text-sm font-semibold tabular-nums text-primary">
            {formatRM(totalPipeline)}
          </div>
        </div>
      </div>

      {/* AI auto-balance */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-[#121214] to-[#1a1c23] p-5 shadow-ai-glow">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary to-secondary opacity-60" />
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <BrainCircuit className="h-4 w-4" strokeWidth={2.25} />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
              AI Optimization
            </span>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
            Ready
          </span>
        </div>
        <p className="mb-4 text-sm text-on-surface-variant">
          {polygons.length >= 2
            ? `Uneven load detected across ${polygons.length} clusters. Rebalancing could tighten revenue density by an estimated 14%.`
            : "Load the demo territory or upload a CSV to unlock cluster-level rebalancing."}
        </p>
        <button
          type="button"
          disabled={polygons.length < 2 || isStaticFallback}
          className={`
            inline-flex w-full items-center justify-center gap-2
            rounded-lg bg-gradient-to-r from-primary-container to-secondary-container
            py-2 text-sm font-semibold text-white
            transition-opacity
            ${
              polygons.length < 2 || isStaticFallback
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:opacity-90"
            }
          `}
        >
          <Scale className="h-4 w-4" strokeWidth={2.25} /> Auto-Balance Regions
        </button>
      </div>

      {/* Territory list */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
          Active Territories ({polygons.length})
        </h3>
        <button
          type="button"
          aria-label="Filter territories"
          className="text-on-surface-variant transition-colors hover:text-primary"
        >
          <Filter className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {polygons.length === 0 ? (
          <EmptyRail />
        ) : (
          polygons.map((p, idx) => (
            <TerritoryCard
              key={p.name}
              territory={p}
              index={idx}
              active={selected === p.name}
              onSelect={() => onSelect(p.name)}
              isStaticFallback={isStaticFallback}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EmptyRail() {
  return (
    <div className="rounded-xl border border-white/5 bg-[#121214]/60 p-6 text-center">
      <p className="text-sm text-on-surface">No territories loaded.</p>
      <p className="mt-2 text-xs text-on-surface-variant">
        Activate Demo Mode or upload a CSV from the Overview page to populate
        territory clusters.
      </p>
    </div>
  );
}

function TerritoryCard({
  territory,
  index,
  active,
  onSelect,
  isStaticFallback,
}: {
  territory: TerritoryPolygon;
  index: number;
  active: boolean;
  onSelect: () => void;
  isStaticFallback: boolean;
}) {
  const accent: "primary" | "secondary" | "tertiary" =
    (["primary", "secondary", "tertiary"] as const)[index % 3] ?? "primary";
  const status: "Target Met" | "High Potential" | "At Risk" = isStaticFallback
    ? "High Potential"
    : territory.highTierCount >= territory.count / 2
      ? "Target Met"
      : territory.count >= 3
        ? "High Potential"
        : "At Risk";
  const opportunityScore = isStaticFallback
    ? 70
    : Math.min(
        99,
        Math.max(
          25,
          Math.round(
            (territory.highTierCount / Math.max(territory.count, 1)) * 70 +
              Math.min(territory.totalValue / 10000, 30),
          ),
        ),
      );

  const accentClass = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    tertiary: "bg-tertiary",
  }[accent];

  const statusColor = {
    "Target Met": "text-primary",
    "High Potential": "text-secondary",
    "At Risk": "text-tertiary",
  }[status];

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: "easeOut" }}
      whileHover={{ y: -1 }}
      className={`
        group relative w-full cursor-pointer overflow-hidden rounded-xl
        border bg-[#121214] p-4 text-left
        transition-colors
        ${active ? "border-primary/60 shadow-ai-glow" : "border-white/5 hover:border-white/10 hover:bg-surface-variant/10"}
      `}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 transition-all group-hover:w-1.5 ${accentClass}`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-on-surface">
            {territory.name}
          </h4>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            {isStaticFallback
              ? "Preview · activate demo mode"
              : `${territory.count} account${territory.count === 1 ? "" : "s"} · ${territory.highTierCount} High tier`}
          </p>
        </div>
        <div className="text-right">
          <div
            className={`font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${statusColor}`}
          >
            {status}
          </div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums">
            {isStaticFallback ? "—" : formatRM(territory.totalValue)}
          </div>
        </div>
      </div>

      <div className="mt-4 pl-2">
        <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
          <span className="inline-flex items-center gap-1">
            <Activity className="h-3 w-3" strokeWidth={2.25} /> AI Opp Score
          </span>
          <span className="text-secondary">{opportunityScore}/100</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#09090A]">
          <div
            className="h-full rounded-full bg-secondary"
            style={{ width: `${opportunityScore}%` }}
          />
        </div>
      </div>
    </motion.button>
  );
}

function formatRM(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "RM 0";
  const rounded = Math.round(value);
  if (rounded >= 1_000_000) return `RM ${(rounded / 1_000_000).toFixed(2)}M`;
  if (rounded >= 1_000) return `RM ${(rounded / 1_000).toFixed(0)}k`;
  return `RM ${rounded.toLocaleString("en-US")}`;
}
