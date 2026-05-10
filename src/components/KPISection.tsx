"use client";

/**
 * KPISection
 *
 * The top-row KPI bar for the Rovr dashboard. Renders four premium KPI
 * tiles: Estimated Revenue, Route Efficiency, Travel Saved, and Priority
 * Customers.
 *
 * Ownership note: this is the presentation shell. It currently renders
 * static mock constants so the visual layer can land before the
 * `useKPIStore` wiring (see `.kiro/specs/rovr-frontend-polish/requirements.md`
 * Requirement 4). When the store is connected, replace `MOCK_KPIS` with a
 * `useKPIStore((s) => s.kpis)` selector and format each value with the
 * helpers below.
 */

import { Clock, TrendingUp, Users, Zap } from "lucide-react";

import { KPICard, type KPIAccent } from "@/components/KPICard";

interface KPITileConfig {
  label: string;
  value: string;
  hint?: string;
  icon: typeof TrendingUp;
  accent: KPIAccent;
}

/**
 * Mock KPI values. Currency follows the product rule: Malaysian Ringgit
 * (RM) via the `en-MY` locale. Swap these for live `KPIData` once the
 * store is wired.
 */
const MOCK_KPIS: readonly KPITileConfig[] = [
  {
    label: "Estimated Revenue",
    value: "RM 48,250",
    hint: "+12% vs yesterday",
    icon: TrendingUp,
    accent: "blue",
  },
  {
    label: "Route Efficiency",
    value: "94%",
    hint: "optimized",
    icon: Zap,
    accent: "violet",
  },
  {
    label: "Travel Saved",
    value: "38 min",
    hint: "vs naive route",
    icon: Clock,
    accent: "cyan",
  },
  {
    label: "Priority Customers",
    value: "12",
    hint: "High tier",
    icon: Users,
    accent: "fuchsia",
  },
] as const;

export function KPISection() {
  return (
    <section
      aria-label="Key performance indicators"
      className="grid h-full w-full grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
    >
      {MOCK_KPIS.map((kpi) => (
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

export default KPISection;
