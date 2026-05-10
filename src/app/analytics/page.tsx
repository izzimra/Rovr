/**
 * Analytics & ROI page.
 *
 * Bento-style dashboard that mirrors the reference: a large ROI summary
 * card with a bar chart, a revenue-per-mile trend card, a circular
 * progress card for visit-to-close ratio, a time-saved breakdown card,
 * and a two-up AI-vs-manual strategy impact section.
 *
 * Presentation-only. Numbers are static mock values; wire them to the
 * analytics layer later by swapping the mock consts for selectors.
 */

import {
  Download,
  Handshake,
  Route,
  Sparkles,
  TrendingUp,
  UserSearch,
  Wand2,
} from "lucide-react";

import { PageHeader } from "@/components/shell/PageHeader";

export default function AnalyticsPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 md:px-10">
      <PageHeader
        eyebrow="Real-Time ROI"
        title="Analytics Engine"
        description="Long-term ROI tracking and performance forecasting powered by Rovr AI."
        actions={
          <>
            <ChromeButton>
              <Download className="h-4 w-4" strokeWidth={2} />
              Download Report
            </ChromeButton>
            <PrimaryButton>
              <Wand2 className="h-4 w-4" strokeWidth={2.25} />
              Optimize Settings
            </PrimaryButton>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <RoiSummaryCard />
        <RevenuePerMileCard />
        <VisitToCloseCard />
        <TimeSavedCard />
        <StrategyImpactSection />
      </div>
    </div>
  );
}

/* ─── ROI summary ───────────────────────────────────────────────── */

function RoiSummaryCard() {
  const bars = [40, 45, 60, 75, 55, 85, 48, 70, 40, 95] as const;
  return (
    <GlassCard className="relative col-span-12 overflow-hidden p-8 lg:col-span-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-12 flex items-start justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
              Net Strategy Impact
            </p>
            <h3 className="text-5xl font-semibold tracking-tight text-primary">
              +RM 124.8k
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 px-3 py-1 text-xs font-semibold text-tertiary">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.25} />
            +22.4%
          </span>
        </div>

        {/* Bar chart */}
        <div className="flex h-56 w-full items-end gap-2 px-1">
          {bars.map((h, i) => {
            const isAiOptimized = [2, 3, 5, 7, 9].includes(i);
            return (
              <div
                key={i}
                className={`
                  group relative flex-1 rounded-t-lg transition-colors
                  ${
                    isAiOptimized
                      ? "border-t-2 border-primary bg-primary/30"
                      : "bg-outline-variant/20 hover:bg-outline-variant/40"
                  }
                `}
                style={{ height: `${h}%` }}
              >
                {i === 3 ? (
                  <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-primary/20 bg-surface-container/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-primary opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    AI Optimized
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant/60">
          <span>Jan 01</span>
          <span>Jan 08</span>
          <span>Jan 15</span>
          <span>Jan 22</span>
          <span>Jan 29</span>
        </div>
      </div>
    </GlassCard>
  );
}

/* ─── Revenue per mile ──────────────────────────────────────────── */

function RevenuePerMileCard() {
  return (
    <GlassCard className="col-span-12 flex flex-col p-6 md:col-span-6 lg:col-span-4">
      <div className="mb-6 flex items-center gap-3">
        <Route className="h-5 w-5 text-secondary" strokeWidth={2} />
        <h4 className="font-semibold text-on-surface">Revenue per Mile</h4>
      </div>
      <div className="flex-1">
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight tabular-nums text-on-surface">
            RM 4.12
          </span>
          <span className="text-sm text-secondary">+14%</span>
        </div>
        <div className="mt-4 h-24 w-full">
          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="rpm-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(173,198,255,0.25)" />
                <stop offset="100%" stopColor="rgba(173,198,255,0)" />
              </linearGradient>
            </defs>
            <path
              d="M0,35 C20,30 40,38 60,15 S80,5 100,2 L100,40 L0,40 Z"
              fill="url(#rpm-fill)"
            />
            <path
              d="M0,35 C20,30 40,38 60,15 S80,5 100,2"
              fill="none"
              stroke="#adc6ff"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
      <p className="mt-6 border-t border-outline-variant/10 pt-6 text-sm text-on-surface-variant">
        Efficiency is 12% above benchmark for regional logistics.
      </p>
    </GlassCard>
  );
}

/* ─── Visit-to-close ────────────────────────────────────────────── */

function VisitToCloseCard() {
  const pct = 72;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <GlassCard className="col-span-12 flex flex-col p-6 md:col-span-6 lg:col-span-4">
      <div className="mb-6 flex items-center gap-3">
        <Handshake className="h-5 w-5 text-tertiary" strokeWidth={2} />
        <h4 className="font-semibold text-on-surface">Visit-to-Close Ratio</h4>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="relative h-32 w-32">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="rgba(66,71,84,0.3)"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="#ffb786"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-semibold tabular-nums">{pct}%</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
              Target 80%
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <LegendDot color="bg-tertiary" label="Closed" />
        <LegendDot color="bg-outline-variant/50" label="Pending" />
      </div>
    </GlassCard>
  );
}

/* ─── Time saved ────────────────────────────────────────────────── */

function TimeSavedCard() {
  return (
    <GlassCard className="col-span-12 flex flex-col gap-8 p-6 lg:col-span-8 md:flex-row">
      <div className="flex flex-col justify-center md:w-1/3">
        <div className="mb-4 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" strokeWidth={2} />
          <h4 className="font-semibold text-on-surface">Time Saved</h4>
        </div>
        <div className="mb-1 text-4xl font-semibold tracking-tight text-primary">
          428h
        </div>
        <p className="text-sm text-on-surface-variant">
          Monthly reduction in administrative transit planning.
        </p>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4">
        <StatBox label="Route Reduction" value="1,240 km" pct={65} color="bg-primary" />
        <StatBox label="Fuel Efficiency" value="18.5%" pct={82} color="bg-secondary" />
        <StatBox label="Stop Density" value="+3.2/hr" pct={45} color="bg-tertiary" />
        <StatBox label="Fleet Utilization" value="94%" pct={94} color="bg-primary/70" />
      </div>
    </GlassCard>
  );
}

function StatBox({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/10 bg-surface-container-highest/30 p-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant/70">
        {label}
      </div>
      <div className="text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-outline-variant/20">
        <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Strategy impact ───────────────────────────────────────────── */

function StrategyImpactSection() {
  return (
    <section className="col-span-12 mt-4">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-2xl font-semibold tracking-tight">
          Strategy Impact Analysis
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GlassCard className="border-l-2 border-l-primary p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-inset ring-primary/30">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={2.25} />
            </div>
            <div>
              <h4 className="font-semibold text-on-surface">
                AI Recommended Paths
              </h4>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                Dynamic Re-Routing Enabled
              </p>
            </div>
          </div>

          <MetricRow
            label="Weekly Revenue per Agent"
            value="RM 12,450"
            pct={100}
            valueTone="text-primary"
          />
          <MetricRow
            label="Average Wait Time"
            value="12 mins"
            pct={30}
            valueTone="text-primary"
          />

          <div className="mt-6 rounded-lg border border-primary/10 bg-primary/5 p-4 text-sm italic text-primary">
            "AI predicts a further 5% revenue uplift if territory boundaries are
            adjusted in the North-East sector."
          </div>
        </GlassCard>

        <GlassCard className="border-l-2 border-l-outline-variant p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-outline-variant/20 ring-1 ring-inset ring-outline-variant/30">
              <UserSearch
                className="h-5 w-5 text-on-surface-variant"
                strokeWidth={2}
              />
            </div>
            <div>
              <h4 className="font-semibold text-on-surface">
                Manual Planning Baseline
              </h4>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                Static Schedules Only
              </p>
            </div>
          </div>

          <MetricRow
            label="Weekly Revenue per Agent"
            value="RM 8,120"
            pct={65}
            valueTone="text-on-surface"
            barTone="bg-outline-variant"
          />
          <MetricRow
            label="Average Wait Time"
            value="48 mins"
            pct={100}
            valueTone="text-on-surface"
            barTone="bg-outline-variant"
          />

          <div className="mt-6 rounded-lg border border-outline-variant/10 bg-surface-container-highest/20 p-4 text-sm text-on-surface-variant">
            "Manual legacy routing shows 3.4x higher fuel waste due to
            backtracking in overlapping zones."
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

function MetricRow({
  label,
  value,
  pct,
  valueTone,
  barTone = "bg-primary",
}: {
  label: string;
  value: string;
  pct: number;
  valueTone: string;
  barTone?: string;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-end justify-between">
        <span className="text-sm text-on-surface-variant">{label}</span>
        <span className={`text-sm font-semibold ${valueTone}`}>{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-outline-variant/10">
        <div className={`${barTone} h-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Shared atoms ──────────────────────────────────────────────── */

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        rounded-xl border border-white/5 bg-[#121214]/80 backdrop-blur-xl
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function ChromeButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="
        inline-flex cursor-pointer items-center gap-2 rounded-lg
        border border-outline-variant/20 bg-surface-container-highest/60
        px-4 py-2 text-sm font-semibold text-on-surface
        transition-colors hover:bg-surface-container-highest
      "
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="
        inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary
        px-4 py-2 text-sm font-semibold text-on-primary
        transition-transform active:scale-95
      "
    >
      {children}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      <span className="text-on-surface-variant">{label}</span>
    </div>
  );
}
