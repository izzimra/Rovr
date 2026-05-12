/**
 * Customers page.
 *
 * Live directory of the rep's current territory. Reads from
 * `useCustomerStore.ranked` and projects each record into the rich card
 * layout: tier badge, territory chip, pipeline value, churn-risk bar,
 * and Rovr's AI-authored "next best action" snippet (the deterministic
 * or Gemini-sourced `explanation`).
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/shell/PageHeader";
import { classifyTerritory } from "@/lib/ai/context";
import { useCustomerStore } from "@/store/customer-store";
import type { PriorityTier, RankedCustomer } from "@/types/customer";

/* ─── Derived shape for the card grid ───────────────────────────── */

interface DerivedCustomerCard {
  ref: RankedCustomer;
  tier: PriorityTier;
  territory: string;
  sector: string;
  sectorTone: "primary" | "secondary" | "outline";
  revenueBand: string;
  riskLevel: "Low" | "Medium" | "High";
  riskPct: number;
  nextBestAction: string;
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function CustomersPage() {
  const ranked = useCustomerStore((s) => s.ranked);
  const demoMode = useCustomerStore((s) => s.demoMode);
  const [tierFilter, setTierFilter] = useState<PriorityTier | "All">("All");

  const cards = useMemo(
    () => ranked.map(deriveCard).filter((c) => tierFilter === "All" || c.tier === tierFilter),
    [ranked, tierFilter],
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 md:px-10">
      <PageHeader
        eyebrow={`${demoMode ? "Demo Mode" : "Live"} · ${ranked.length} Accounts`}
        title="Customers"
        description="Manage and analyze your B2B accounts across the Klang Valley."
        actions={
          <>
            <button
              type="button"
              className="
                inline-flex cursor-pointer items-center gap-2 rounded-lg
                border border-white/10 px-4 py-2 text-sm text-on-surface
                transition-colors hover:border-white/30
              "
            >
              <Filter className="h-4 w-4" strokeWidth={2} /> Filters
            </button>
            <button
              type="button"
              className="
                inline-flex cursor-pointer items-center gap-2 rounded-lg
                bg-primary px-4 py-2 text-sm font-semibold text-on-primary
                transition-transform active:scale-95
              "
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} /> New Account
            </button>
          </>
        }
      />

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-3">
        <TierFilterChip
          label="All"
          active={tierFilter === "All"}
          onClick={() => setTierFilter("All")}
        />
        <TierFilterChip
          label="High"
          active={tierFilter === "High"}
          onClick={() => setTierFilter("High")}
        />
        <TierFilterChip
          label="Medium"
          active={tierFilter === "Medium"}
          onClick={() => setTierFilter("Medium")}
        />
        <TierFilterChip
          label="Low"
          active={tierFilter === "Low"}
          onClick={() => setTierFilter("Low")}
        />
      </div>

      {/* Grid */}
      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <CustomerCardView key={c.ref.customer_name} customer={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Derive card shape from a RankedCustomer ───────────────────── */

function deriveCard(ref: RankedCustomer): DerivedCustomerCard {
  const territory = classifyTerritory(ref.latitude, ref.longitude);
  const sector = inferSector(ref.customer_name);
  const sectorTone: DerivedCustomerCard["sectorTone"] = (
    ["primary", "secondary", "outline"] as const
  )[ref.rank % 3] ?? "primary";

  const riskPct = Math.max(
    5,
    Math.min(95, Math.round(ref.last_visit_days * 1.2 + (100 - ref.potential_score) * 0.4)),
  );
  const riskLevel: DerivedCustomerCard["riskLevel"] =
    riskPct >= 60 ? "High" : riskPct >= 35 ? "Medium" : "Low";

  const revenueBand =
    ref.sales_value >= 150_000
      ? `RM ${Math.round(ref.sales_value / 1000)}k`
      : ref.sales_value >= 75_000
        ? `RM ${Math.round(ref.sales_value / 1000)}k`
        : `RM ${Math.round(ref.sales_value / 1000)}k`;

  return {
    ref,
    tier: ref.tier,
    territory,
    sector,
    sectorTone,
    revenueBand,
    riskLevel,
    riskPct,
    nextBestAction: ref.explanation,
  };
}

function inferSector(name: string): string {
  const lower = name.toLowerCase();
  if (/tower|plaza|klcc|fintech|capital|holdings|ventures/.test(lower))
    return "Enterprise";
  if (/manufacturing|industrial|logistics|distribution/.test(lower))
    return "Industrial";
  if (/retail|mart|village|pyramid|megastores|tech/.test(lower))
    return "Retail";
  if (/airport|business park|campus/.test(lower)) return "Logistics";
  return "B2B";
}

/* ─── Atoms ─────────────────────────────────────────────────────── */

function TierFilterChip({
  label,
  active,
  onClick,
}: {
  label: PriorityTier | "All";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5
        font-mono text-[10px] uppercase tracking-[0.14em] transition-colors
        ${
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-white/10 bg-surface-variant/20 text-on-surface-variant hover:border-white/30 hover:text-on-surface"
        }
      `}
    >
      <span>{label}</span>
      {active && label !== "All" ? (
        <X className="h-3 w-3" strokeWidth={2} />
      ) : null}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-white/5 bg-[#121214]/60 p-10 text-center">
      <p className="text-sm text-on-surface">No customers match this filter.</p>
      <p className="mt-2 text-xs text-on-surface-variant">
        Activate Demo Mode or upload a CSV from the Overview page to populate
        the directory.
      </p>
    </div>
  );
}

function CustomerCardView({ customer }: { customer: DerivedCustomerCard }) {
  const sectorClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    outline: "bg-outline/10 text-on-surface-variant border-outline/20",
  }[customer.sectorTone];

  const riskTone = {
    Low: "text-primary",
    Medium: "text-tertiary",
    High: "text-error",
  }[customer.riskLevel];

  const riskBar = {
    Low: "bg-primary",
    Medium: "bg-tertiary",
    High: "bg-gradient-to-r from-error to-tertiary",
  }[customer.riskLevel];

  const tierTone = {
    High: "text-primary",
    Medium: "text-tertiary",
    Low: "text-on-surface-variant",
  }[customer.tier];

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="
        flex flex-col gap-4 rounded-xl border border-white/5
        bg-[#121214] p-6 transition-colors
        hover:bg-surface-variant/10
      "
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-on-surface">
              {customer.ref.customer_name}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${sectorClasses}`}
            >
              {customer.sector}
            </span>
          </div>
          <p className="inline-flex items-center gap-1 text-sm text-on-surface-variant">
            <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
            {customer.territory}
          </p>
        </div>
        <button
          type="button"
          aria-label="More actions"
          className="text-on-surface-variant transition-colors hover:text-primary"
        >
          <MoreVertical className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-4">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            Rank / Score
          </p>
          <p className="text-sm text-on-surface">
            #{customer.ref.rank} · {customer.ref.score.toFixed(1)}/100
          </p>
          <p className="text-xs text-on-surface-variant">
            Last visit {customer.ref.last_visit_days}d ago
          </p>
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            Pipeline Value
          </p>
          <p className="text-sm font-semibold text-on-surface tabular-nums">
            {customer.revenueBand}
          </p>
          <p className={`text-xs ${tierTone}`}>{customer.tier} tier</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-end justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            Churn Risk
          </p>
          <p
            className={`font-mono text-[10px] uppercase tracking-[0.14em] ${riskTone}`}
          >
            {customer.riskLevel} ({customer.riskPct}%)
          </p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-variant">
          <div
            className={`h-full ${riskBar}`}
            style={{ width: `${customer.riskPct}%` }}
          />
        </div>
      </div>

      {/* Next best action — live AI-authored explanation */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 shadow-ai-glow">
        <Sparkles
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          strokeWidth={2.25}
        />
        <div className="min-w-0">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
            Rovr AI · Next Best Action
          </p>
          <p className="text-sm leading-snug text-on-surface">
            {customer.nextBestAction}
          </p>
        </div>
      </div>
    </motion.article>
  );
}
