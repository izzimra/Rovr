"use client";

/**
 * CustomerRankingPanel
 *
 * Left-hand panel of the Rovr dashboard: a scrollable, premium list of
 * ranked customers surfaced by the prioritization service.
 *
 * Visual grammar (see `.kiro/specs/rovr-frontend-polish/requirements.md`
 * Requirement 5):
 *   - Compact card per row: `bg-[#111111] border-white/5 rounded-xl`.
 *   - Rank number in muted tabular numerals on the left.
 *   - Customer name + location (location is UI-only; see DisplayCustomer).
 *   - Priority badge with tier-tinted `bg-<tier>/10 text-<tier>-400`.
 *   - Muted AI reasoning snippet below the name row.
 *   - Framer Motion layout animations — row enter/exit/reorder feel smooth
 *     the moment the list becomes dynamic from `useCustomerStore.ranked`.
 *
 * Presentation-only. Mock data will be replaced with a read-only selector:
 *   `useCustomerStore((s) => s.ranked)` — see Requirement 5.2.
 */

import { AnimatePresence, motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import type { PriorityTier, RankedCustomer } from "@/types/customer";

/**
 * UI-only extension of `RankedCustomer`. `location` is a human-readable
 * label derived from `latitude` / `longitude` upstream; the underlying
 * domain type remains untouched per Requirement 9.2.
 */
type DisplayCustomer = RankedCustomer & { location: string };

/** Malaysian Ringgit formatter — matches the `en-MY` product rule. */
const MYR = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

/** Mock data grounded in the Klang Valley. Shape-compatible with the store. */
const MOCK_CUSTOMERS: readonly DisplayCustomer[] = [
  {
    rank: 1,
    score: 94.2,
    tier: "High",
    customer_name: "Tan Beverages Sdn Bhd",
    location: "Petaling Jaya",
    latitude: 3.1073,
    longitude: 101.6067,
    sales_value: 18400,
    priority: 9,
    last_visit_days: 21,
    potential_score: 92,
    explanation: "High churn risk, nearest to current route",
  },
  {
    rank: 2,
    score: 88.6,
    tier: "High",
    customer_name: "Sinar Mart",
    location: "Shah Alam",
    latitude: 3.0733,
    longitude: 101.5185,
    sales_value: 14200,
    priority: 8,
    last_visit_days: 14,
    potential_score: 86,
    explanation: "Top-tier pipeline, due for quarterly review",
  },
  {
    rank: 3,
    score: 74.1,
    tier: "Medium",
    customer_name: "Kopitiam Harmoni",
    location: "Subang Jaya",
    latitude: 3.0438,
    longitude: 101.5806,
    sales_value: 8700,
    priority: 6,
    last_visit_days: 9,
    potential_score: 71,
    explanation: "Stable account, high upsell propensity",
  },
  {
    rank: 4,
    score: 62.8,
    tier: "Medium",
    customer_name: "Bangi Fresh Grocers",
    location: "Bangi",
    latitude: 2.9129,
    longitude: 101.7821,
    sales_value: 6100,
    priority: 5,
    last_visit_days: 30,
    potential_score: 64,
    explanation: "Lapsed 30 days, worth a courtesy stop",
  },
  {
    rank: 5,
    score: 41.5,
    tier: "Low",
    customer_name: "Central Provisions",
    location: "Kuala Lumpur",
    latitude: 3.139,
    longitude: 101.6869,
    sales_value: 3400,
    priority: 3,
    last_visit_days: 5,
    potential_score: 38,
    explanation: "Recent visit, low urgency — bundle if on route",
  },
];

export function CustomerRankingPanel() {
  return (
    <div className="flex h-full w-full flex-col">
      <PanelHeader count={MOCK_CUSTOMERS.length} />

      <div
        className="
          flex-1 overflow-y-auto px-3 pb-3
          [scrollbar-width:thin]
          [scrollbar-color:theme(colors.zinc.700)_transparent]
        "
      >
        <motion.ul className="flex flex-col gap-2" layout>
          <AnimatePresence initial={false}>
            {MOCK_CUSTOMERS.map((customer) => (
              <CustomerRow key={customer.customer_name} customer={customer} />
            ))}
          </AnimatePresence>
        </motion.ul>
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
        {count} stops
      </span>
    </header>
  );
}

/* ─── Row ───────────────────────────────────────────────────────── */

function CustomerRow({ customer }: { customer: DisplayCustomer }) {
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
                {customer.location}
              </div>
            </div>

            <TierBadge tier={customer.tier} />
          </div>
        </div>
      </div>

      {/* Row 2 — AI reasoning snippet */}
      <p className="mt-2.5 pl-9 text-xs leading-relaxed text-zinc-400">
        {customer.explanation}
      </p>

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

/** Rank chip — tabular numerals, muted, consistent width. */
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

/** Priority tier pill — glows per tier. */
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

export default CustomerRankingPanel;
