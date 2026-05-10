/**
 * Territories page.
 *
 * Two-column layout: a dark premium map canvas on the left (CSS-only
 * backdrop — no Mapbox, no remote tiles) and a details rail on the right
 * with an AI auto-balance card and a scrollable active-territories list.
 *
 * Presentation-only. Numbers and territory names are static mocks;
 * territory cards are shape-compatible with a future `Territory` domain
 * type when the routing/maps teammate lands it.
 */

"use client";

import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Filter,
  Layers,
  Locate,
  Minus,
  Plus,
  Scale,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

/* ─── Mock data ─────────────────────────────────────────────────── */

type TerritoryStatus = "Target Met" | "High Potential" | "At Risk";

interface Territory {
  name: string;
  assignee: string;
  status: TerritoryStatus;
  value: string;
  opportunityScore: number;
  accent: "primary" | "secondary" | "tertiary";
}

const TERRITORIES: readonly Territory[] = [
  {
    name: "Petaling Jaya Central",
    assignee: "Sarah J.",
    status: "Target Met",
    value: "RM 1.2M",
    opportunityScore: 92,
    accent: "primary",
  },
  {
    name: "Shah Alam East",
    assignee: "Michael T.",
    status: "High Potential",
    value: "RM 840k",
    opportunityScore: 88,
    accent: "secondary",
  },
  {
    name: "Subang Industrial",
    assignee: "Aisha R.",
    status: "Target Met",
    value: "RM 690k",
    opportunityScore: 81,
    accent: "primary",
  },
  {
    name: "Bangi South",
    assignee: "Unassigned",
    status: "At Risk",
    value: "RM 420k",
    opportunityScore: 75,
    accent: "tertiary",
  },
];

/* ─── Page ──────────────────────────────────────────────────────── */

export default function TerritoriesPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 p-6 lg:flex-row">
      <MapCanvas />
      <TerritoryRail />
    </div>
  );
}

/* ─── Map canvas ────────────────────────────────────────────────── */

function MapCanvas() {
  return (
    <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl border border-outline-variant/10 bg-[#0A0A0B] shadow-2xl">
      {/* Backdrop — radial glow + line grid, no remote tiles. */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-0
          bg-[radial-gradient(circle_at_40%_30%,rgba(173,198,255,0.08),transparent_55%)]
        "
      >
        <div
          className="
            absolute inset-0 opacity-40
            [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]
            [background-size:56px_56px]
          "
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(10,10,11,0.9)_100%)]" />
      </div>

      {/* Faux territory polygons */}
      <TerritoryOverlay />

      {/* Top-left controls */}
      <div className="absolute left-6 top-6 z-10 flex flex-col gap-2">
        <div className="overflow-hidden rounded-lg border border-white/5 bg-surface-container-low/80 backdrop-blur-xl">
          <MapButton label="Zoom in">
            <Plus className="h-4 w-4" strokeWidth={2.25} />
          </MapButton>
          <div className="h-px bg-white/5" />
          <MapButton label="Zoom out">
            <Minus className="h-4 w-4" strokeWidth={2.25} />
          </MapButton>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/5 bg-surface-container-low/80 backdrop-blur-xl">
          <MapButton label="Toggle layers">
            <Layers className="h-4 w-4" strokeWidth={2.25} />
          </MapButton>
        </div>
        <div className="overflow-hidden rounded-full border border-white/5 bg-surface-container-low/80 backdrop-blur-xl">
          <MapButton label="Re-center">
            <Locate className="h-4 w-4" strokeWidth={2.25} />
          </MapButton>
        </div>
      </div>

      {/* Floating AI rebalance card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="
          absolute inset-x-6 bottom-6 z-10
          flex flex-col items-start justify-between gap-4 rounded-xl
          border border-primary/20 bg-black/40 p-6 backdrop-blur-xl
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
            Detected 12% inefficiency in the North-West sector. Proposed
            realignment could increase coverage by 18%.
          </p>
        </div>
        <button
          type="button"
          className="
            inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary
            px-5 py-2 text-sm font-semibold text-on-primary
            transition-transform active:scale-95
          "
        >
          Preview Recommendation
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </motion.div>
    </div>
  );
}

function MapButton({
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
        text-on-surface transition-colors duration-200
        hover:bg-white/10 hover:text-primary
      "
    >
      {children}
    </button>
  );
}

/** Faux glowing polygons so the empty map reads as "territories". */
function TerritoryOverlay() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="t-blue" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(173,198,255,0.25)" />
          <stop offset="100%" stopColor="rgba(173,198,255,0)" />
        </radialGradient>
        <radialGradient id="t-violet" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(208,188,255,0.22)" />
          <stop offset="100%" stopColor="rgba(208,188,255,0)" />
        </radialGradient>
        <radialGradient id="t-orange" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,183,134,0.2)" />
          <stop offset="100%" stopColor="rgba(255,183,134,0)" />
        </radialGradient>
      </defs>

      <polygon
        points="18,22 40,18 46,38 28,46 14,38"
        fill="url(#t-blue)"
        stroke="rgba(173,198,255,0.45)"
        strokeWidth="0.25"
      />
      <polygon
        points="52,26 74,22 80,44 60,52 48,42"
        fill="url(#t-violet)"
        stroke="rgba(208,188,255,0.45)"
        strokeWidth="0.25"
      />
      <polygon
        points="22,58 42,54 52,72 34,82 18,74"
        fill="url(#t-blue)"
        stroke="rgba(173,198,255,0.35)"
        strokeWidth="0.25"
      />
      <polygon
        points="58,60 82,58 84,80 66,86 54,74"
        fill="url(#t-orange)"
        stroke="rgba(255,183,134,0.45)"
        strokeWidth="0.25"
      />
    </svg>
  );
}

/* ─── Rail ──────────────────────────────────────────────────────── */

function TerritoryRail() {
  return (
    <div className="flex w-full flex-col gap-4 overflow-y-auto lg:max-w-[420px]">
      {/* Region overview */}
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#121214]/80 p-4 backdrop-blur-xl">
        <div>
          <h2 className="font-semibold text-on-surface">Region Overview</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            Klang Valley · 08 active territories
          </p>
        </div>
        <button
          type="button"
          className="
            inline-flex cursor-pointer items-center gap-1 rounded-lg border
            border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase
            tracking-[0.08em] text-on-surface transition-colors
            hover:border-white/30
          "
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} /> New
        </button>
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
          Uneven load detected across North-West sectors. Rebalancing could
          increase coverage efficiency by 14%.
        </p>
        <button
          type="button"
          className="
            inline-flex w-full cursor-pointer items-center justify-center gap-2
            rounded-lg bg-gradient-to-r from-primary-container to-secondary-container
            py-2 text-sm font-semibold text-white
            transition-opacity hover:opacity-90
          "
        >
          <Scale className="h-4 w-4" strokeWidth={2.25} /> Auto-Balance Regions
        </button>
      </div>

      {/* Territory list */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
          Active Territories ({TERRITORIES.length})
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
        {TERRITORIES.map((t) => (
          <TerritoryCard key={t.name} territory={t} />
        ))}
      </div>
    </div>
  );
}

function TerritoryCard({ territory }: { territory: Territory }) {
  const accentClass = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    tertiary: "bg-tertiary",
  }[territory.accent];

  const statusColor = {
    "Target Met": "text-primary",
    "High Potential": "text-secondary",
    "At Risk": "text-tertiary",
  }[territory.status];

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="
        group relative cursor-pointer overflow-hidden rounded-xl
        border border-white/5 bg-[#121214] p-4
        transition-colors hover:border-white/10 hover:bg-surface-variant/10
      "
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
            Assigned: {territory.assignee}
          </p>
        </div>
        <div className="text-right">
          <div
            className={`font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${statusColor}`}
          >
            {territory.status}
          </div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums">
            {territory.value}
          </div>
        </div>
      </div>

      <div className="mt-4 pl-2">
        <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
          <span className="inline-flex items-center gap-1">
            <Activity className="h-3 w-3" strokeWidth={2.25} /> AI Opp Score
          </span>
          <span className="text-secondary">
            {territory.opportunityScore}/100
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#09090A]">
          <div
            className="h-full rounded-full bg-secondary"
            style={{ width: `${territory.opportunityScore}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
