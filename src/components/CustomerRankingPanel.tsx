"use client";

/**
 * CustomerRankingPanel
 *
 * Left-hand panel of the Rovr dashboard: a scrollable, premium list of
 * ranked customers surfaced by the prioritization service.
 *
 * Data source: reads `useCustomerStore.ranked` per frontend spec Req 5.1.
 * The "location" field shown in each row is derived UI-only from the
 * lat/lng via a coarse Klang Valley classifier — the underlying domain
 * type remains untouched per Req 9.2.
 */

import { AnimatePresence, motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { SkeletonCard, SkeletonLine } from "@/components/SkeletonCard";
import { classifyTerritory } from "@/lib/ai/context";
import { useCustomerStore } from "@/store/customer-store";
import type { PriorityTier, RankedCustomer } from "@/types/customer";

/** Malaysian Ringgit formatter — matches the product rule. */
const MYR = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MYR",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

export function CustomerRankingPanel() {
  const ranked = useCustomerStore((s) => s.ranked);
  const isLoading = useCustomerStore((s) => s.isLoading);
  const error = useCustomerStore((s) => s.error);

  return (
    <div className="flex h-full w-full flex-col">
      <PanelHeader count={ranked.length} />

      <div
        className="
          flex-1 overflow-y-auto px-3 pb-3
          [scrollbar-width:thin]
          [scrollbar-color:theme(colors.zinc.700)_transparent]
        "
      >
        {isLoading && ranked.length === 0 ? (
          <SkeletonList />
        ) : ranked.length === 0 ? (
          <EmptyState error={error} />
        ) : (
          <motion.ul className="flex flex-col gap-2" layout>
            <AnimatePresence initial={false}>
              {ranked.map((customer) => (
                <CustomerRow
                  key={customer.id ?? customer.customer_name}
                  customer={customer}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function PanelHeader({ count }: { count: number }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-4">
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          Priority Customers
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Ranked by Rovr AI
        </span>
      </div>
      <span className="text-xs font-medium tabular-nums text-zinc-500">
        {count} {count === 1 ? "stop" : "stops"}
      </span>
    </header>
  );
}

/* ─── Row ───────────────────────────────────────────────────────── */

function CustomerRow({ customer }: { customer: RankedCustomer }) {
  const location = classifyTerritory(customer.latitude, customer.longitude);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
      whileHover={{ y: -1 }}
      className="
        group cursor-pointer rounded-xl border border-white/5 bg-[#111111] p-3
        transition-colors duration-200
        hover:border-white/10 hover:bg-[#141414]
      "
    >
      {/* Row 1 — rank, name+location, badge */}
      <div className="flex items-start gap-3">
        <RankBadge rank={customer.rank} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-zinc-100">
                {customer.customer_name}
              </div>
              <div className="mt-0.5 truncate text-xs text-zinc-500">
                {location}
              </div>
            </div>

            <TierBadge tier={customer.tier} />
          </div>
        </div>
      </div>

      {/* Row 2 — AI reasoning snippet */}
      {customer.explanation ? (
        <p className="mt-2.5 pl-9 text-xs leading-relaxed text-zinc-400">
          {customer.explanation}
        </p>
      ) : null}

      {/* Row 3 — sales value footnote */}
      <div className="mt-2 flex items-center justify-between pl-9">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
          Pipeline
        </span>
        <span className="text-xs font-semibold tabular-nums text-zinc-300">
          {MYR.format(customer.sales_value)}
        </span>
      </div>
    </motion.li>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-[11px] font-semibold tabular-nums text-zinc-400"
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </div>
  );
}

const TIER_CLASSES: Record<PriorityTier, string> = {
  High: "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20",
  Medium:
    "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20",
  Low: "bg-zinc-500/10 text-zinc-400 ring-1 ring-inset ring-zinc-500/20",
};

function TierBadge({ tier }: { tier: PriorityTier }) {
  return (
    <Badge className={`shrink-0 ${TIER_CLASSES[tier]}`}>{tier}</Badge>
  );
}

/* ─── Placeholders ──────────────────────────────────────────────── */

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Loading customers">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i}>
          <SkeletonCard className="h-[82px] w-full">
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="h-2.5 w-20" />
            <SkeletonLine className="h-2 w-full" />
          </SkeletonCard>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ error }: { error: string | null }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-white/5 bg-zinc-900/40 p-6 text-center">
      <div className="text-sm font-medium text-zinc-300">
        {error ? "Couldn't load customers" : "No customers loaded yet"}
      </div>
      <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-zinc-500">
        {error
          ? error
          : "Upload a CSV or activate Demo Mode to populate today's territory."}
      </p>
    </div>
  );
}

export default CustomerRankingPanel;
