/**
 * Rovr dashboard — root page.
 *
 * Composes the presentation-layer components into the `DashboardShell`:
 *   - KPI bar (top)
 *   - Customer ranking (left, 25%)
 *   - Map shell (center, 50%)
 *   - AI copilot (right, 25%)
 *
 * This file is a Server Component. The interactive children
 * (`KPISection`, `CustomerRankingPanel`, `MapShell`, `CopilotPanel`) are
 * each marked `"use client"` on their own, so they hydrate independently
 * without forcing the whole page into client scope.
 *
 * No API calls, no store selectors, no Mapbox GL JS — assembly only.
 */

import { CopilotPanel } from "@/components/CopilotPanel";
import { CustomerRankingPanel } from "@/components/CustomerRankingPanel";
import { DashboardShell } from "@/components/DashboardShell";
import { KPISection } from "@/components/KPISection";
import { MapShell } from "@/components/MapShell";

export default function DashboardPage() {
  return (
    <DashboardShell
      kpiSlot={<KPISection />}
      rankingSlot={<CustomerRankingPanel />}
      mapSlot={<MapShell />}
      copilotSlot={<CopilotPanel />}
    />
  );
}
