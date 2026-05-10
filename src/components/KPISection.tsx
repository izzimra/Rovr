"use client";

/**
 * KPISection
 *
 * The top-row KPI bar for the Rovr dashboard. Renders four premium KPI
 * tiles: Estimated Revenue, Route Efficiency, Travel Saved, and Priority
 * Customers.
 *
 * Data source: reads `useKPIStore.kpis` directly per frontend spec
 * Requirement 4.1. When the store is still loading (or no data has been
 * seeded yet), falls back to sensible zeros so the tiles render rather
 * than blanking out. Shimmer loading state is handled by `SkeletonCard`
 * — wired below so the tiles breathe while the pipeline runs.
 */

import { Clock, TrendingUp, Users, Zap } from "lucide-react";

import { KPICard, type KPIAccent } from "@/components/KPICard";
import { SkeletonCard, SkeletonLine } from "@/components/SkeletonCard";
import { useKPIStore } from "@/store/kpi-store";

interface KPITileConfig {
  label: string;
  value: string;
  hint?: string;
  icon: typeof TrendingUp;
  accent: KPIAccent;
}

/** Malaysian Ringgit formatter — product rule is RM with thousands grouping. */
const RM = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MYR",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

export function KPISection() {
  const kpis = useKPIStore((s) => s.kpis);
  const isLoading = useKPIStore((s) => s.isLoading);

  // First-paint: shimmer placeholders sized to final tile dimensions.
  // Also covers the case where `kpis` is still null after load (e.g. a
  // pipeline failure).
  if (isLoading || !kpis) {
    return (
      <section
        aria-label="Key performance indicators"
        aria-busy="true"
        className="grid h-full w-full grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-full w-full">
            <SkeletonLine className="h-2.5 w-20" />
            <SkeletonLine className="h-6 w-28" />
          </SkeletonCard>
        ))}
      </section>
    );
  }

  const tiles: readonly KPITileConfig[] = [
    {
      label: "Estimated Revenue",
      value: RM.format(kpis.estimatedRevenue),
      hint: `${Math.round(kpis.opportunityScore)}/100 opportunity`,
      icon: TrendingUp,
      accent: "blue",
    },
    {
      label: "Route Efficiency",
      value: `${RM.format(kpis.routeEfficiency)}/hr`,
      hint: `${kpis.optimizationPercent}% optimized`,
      icon: Zap,
      accent: "violet",
    },
    {
      label: "Travel Saved",
      value: formatTravelSaved(kpis.travelSavedMinutes),
      hint: "vs priority-only",
      icon: Clock,
      accent: "cyan",
    },
    {
      label: "Priority Customers",
      value: String(kpis.priorityCustomers),
      hint: "High tier in route",
      icon: Users,
      accent: "fuchsia",
    },
  ];

  return (
    <section
      aria-label="Key performance indicators"
      className="grid h-full w-full grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
    >
      {tiles.map((kpi) => (
        <KPICard
          key={kpi.label}
          label={kpi.label}
          value={kpi.value}
          hint={kpi.hint}
          icon={kpi.icon}
          accent={kpi.accent}
        />
      ))}
    </section>
  );
}

/** Signed-minute formatter per frontend spec Requirement 4.5. */
function formatTravelSaved(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded === 0) return "0 min";
  if (rounded > 0) return `${rounded} min`;
  return `${rounded} min`; // already negative
}

export default KPISection;
