/**
 * DashboardShell
 *
 * Root layout shell for the Rovr field-sales dashboard.
 *
 *   +---------------------------------------------------------------+
 *   |                  KPI Bar (h-24)                                |
 *   +---------------------------------------------------------------+
 *   |                  AI Insights Strip (optional)                  |
 *   +---------------+------------------------+----------------------+
 *   |   Customer    |                        |      AI              |
 *   |   Ranking     |     Map Container      |    Copilot           |
 *   |    (25%)      |        (50%)           |     (25%)            |
 *   +---------------+------------------------+----------------------+
 *
 * NOTE: The map panel intentionally does NOT add its own glass-surface
 * border. The map slot passes through the caller's ReactNode as-is so
 * RouteMap owns the entire box — no double-nested absolute positioning,
 * no mystery 0x0 sizing.
 */

import type { ReactNode } from "react";

type DashboardShellProps = {
  kpiSlot?: ReactNode;
  insightsSlot?: ReactNode;
  rankingSlot?: ReactNode;
  mapSlot?: ReactNode;
  copilotSlot?: ReactNode;
  overlay?: ReactNode;
};

export function DashboardShell({
  kpiSlot,
  insightsSlot,
  rankingSlot,
  mapSlot,
  copilotSlot,
  overlay,
}: DashboardShellProps = {}) {
  return (
    <div
      className="relative flex h-[calc(100vh-4rem)] w-full flex-col gap-4 overflow-hidden bg-background p-6 text-on-surface"
      aria-label="Rovr dashboard"
    >
      {overlay}

      {/* Top KPI Bar */}
      <section
        aria-label="KPI bar"
        className="flex h-24 shrink-0 items-center rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl"
      >
        {kpiSlot ?? <PlaceholderLabel>KPI Bar</PlaceholderLabel>}
      </section>

      {insightsSlot ? (
        <section aria-label="AI insights">{insightsSlot}</section>
      ) : null}

      {/* Working area */}
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-4">
        <aside
          aria-label="Customer ranking panel"
          className="col-span-1 flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl"
        >
          {rankingSlot ?? (
            <PlaceholderLabel>Customer Ranking</PlaceholderLabel>
          )}
        </aside>

        {/* Map slot — RouteMap owns the box end-to-end. */}
        <section
          aria-label="Map container"
          className="col-span-2 relative min-h-0 overflow-hidden rounded-xl border border-zinc-800/80"
        >
          {mapSlot ?? <PlaceholderLabel>Map Container</PlaceholderLabel>}
        </section>

        <aside
          aria-label="AI copilot panel"
          className="col-span-1 flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl"
        >
          {copilotSlot ?? <PlaceholderLabel>AI Copilot</PlaceholderLabel>}
        </aside>
      </div>
    </div>
  );
}

function PlaceholderLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {children}
      </span>
    </div>
  );
}

export default DashboardShell;
