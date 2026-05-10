/**
 * DashboardShell
 *
 * Root layout shell for the Rovr field-sales dashboard.
 *
 * Structure (see `.kiro/specs/rovr-frontend-polish/requirements.md` Requirement 1):
 *   ┌──────────────────────────────────────────────────────────┐
 *   │                       KPI Bar (h-24)                      │
 *   ├───────────────┬──────────────────────────┬────────────────┤
 *   │   Customer    │                          │      AI        │
 *   │   Ranking     │      Map Container       │    Copilot     │
 *   │    (25%)      │          (50%)           │     (25%)      │
 *   └───────────────┴──────────────────────────┴────────────────┘
 *
 * This file intentionally renders empty placeholder surfaces only. The
 * KPI tiles, customer ranking list, Mapbox shell, and copilot chat are
 * slotted in by their dedicated components.
 */

import type { ReactNode } from "react";

type DashboardShellProps = {
  /** Slot for the top KPI bar (4 KPI tiles). */
  kpiSlot?: ReactNode;
  /** Slot for the left-hand Customer Ranking Panel. */
  rankingSlot?: ReactNode;
  /** Slot for the center Mapbox Shell. */
  mapSlot?: ReactNode;
  /** Slot for the right-hand AI Copilot Panel. */
  copilotSlot?: ReactNode;
};

export function DashboardShell({
  kpiSlot,
  rankingSlot,
  mapSlot,
  copilotSlot,
}: DashboardShellProps = {}) {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] w-full flex-col gap-6 overflow-hidden bg-background p-6 text-on-surface"
      aria-label="Rovr dashboard"
    >
      {/* ── Top Row ─ KPI Bar ─────────────────────────────────────── */}
      <section
        aria-label="KPI bar"
        className="flex h-24 shrink-0 items-center rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl"
      >
        {kpiSlot ?? <PlaceholderLabel>KPI Bar</PlaceholderLabel>}
      </section>

      {/* ── Working Area ─ 25% / 50% / 25% three-column grid ──────── */}
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-6">
        {/* Left — Customer Ranking Panel */}
        <aside
          aria-label="Customer ranking panel"
          className="col-span-1 flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl"
        >
          {rankingSlot ?? (
            <PlaceholderLabel>Customer Ranking</PlaceholderLabel>
          )}
        </aside>

        {/* Center — Map Container Shell */}
        <section
          aria-label="Map container"
          data-rovr-map-slot
          className="col-span-2 relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl"
        >
          {mapSlot ?? <PlaceholderLabel>Map Container</PlaceholderLabel>}
        </section>

        {/* Right — AI Copilot Panel */}
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

/** Small, unobtrusive label used only while slots are empty. */
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
