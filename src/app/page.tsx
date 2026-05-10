/**
 * Rovr dashboard — root page.
 *
 * Composes the presentation-layer components into the `DashboardShell`
 * and mounts the `DashboardHydrator`, which boots the orchestration
 * pipeline (CSV/demo → prioritize → route → KPIs → insights → copilot)
 * on first load.
 */

import { CopilotPanel } from "@/components/CopilotPanel";
import { CustomerRankingPanel } from "@/components/CustomerRankingPanel";
import { DashboardHydrator } from "@/components/DashboardHydrator";
import { DashboardShell } from "@/components/DashboardShell";
import { InsightsStrip } from "@/components/InsightsStrip";
import { KPISection } from "@/components/KPISection";
import { MapShell } from "@/components/MapShell";

export default function DashboardPage() {
  return (
    <DashboardShell
      kpiSlot={<KPISection />}
      insightsSlot={<InsightsStrip />}
      rankingSlot={<CustomerRankingPanel />}
      mapSlot={<MapShell />}
      copilotSlot={<CopilotPanel />}
      overlay={<DashboardHydrator />}
    />
  );
}
