/**
 * Customers page.
 *
 * Data-grid-style directory with filter chips + three card rows. Each
 * card shows contact, revenue tier, churn risk, and an AI "Next Best
 * Action" block, matching the reference Customer Database screen.
 *
 * Presentation-only. Values are static mocks; swap with
 * `useCustomerStore((s) => s.ranked)` projected into this shape once the
 * store selector is wired.
 */

"use client";

import {
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

import { PageHeader } from "@/components/shell/PageHeader";

/* ─── Mock data ─────────────────────────────────────────────────── */

type Tier = "Tier 1" | "Tier 2" | "Tier 3";
type RiskLevel = "Low" | "Medium" | "High";

interface CustomerCard {
  name: string;
  sector: string;
  sectorTone: "primary" | "secondary" | "outline";
  location: string;
  contactName: string;
  contactRole: string;
  revenue: string;
  tier: Tier;
  risk: RiskLevel;
  riskPct: number;
  nextBestAction: string;
  pending?: boolean;
}

const CUSTOMERS: readonly CustomerCard[] = [
  {
    name: "Tan Beverages Sdn Bhd",
    sector: "FMCG",
    sectorTone: "primary",
    location: "Petaling Jaya (NW-01)",
    contactName: "Sarah Jenkins",
    contactRole: "Dir. Operations",
    revenue: "RM 1.2M – 2.5M",
    tier: "Tier 2",
    risk: "High",
    riskPct: 78,
    nextBestAction:
      "Schedule Q3 review to discuss recent supply chain delays affecting their major routes.",
  },
  {
    name: "VoltTech Industrial",
    sector: "Electrical",
    sectorTone: "secondary",
    location: "Shah Alam (NW-02)",
    contactName: "Marcus Thorne",
    contactRole: "Lead Estimator",
    revenue: "RM 4.5M+",
    tier: "Tier 1",
    risk: "Low",
    riskPct: 12,
    nextBestAction:
      "Upsell opportunity detected: propose enterprise licensing based on recent expansion.",
  },
  {
    name: "Ironclad Foundations",
    sector: "Structural",
    sectorTone: "outline",
    location: "Subang Jaya (NW-03)",
    contactName: "Elena Rostova",
    contactRole: "CEO",
    revenue: "RM 800k – 1.2M",
    tier: "Tier 3",
    risk: "Medium",
    riskPct: 45,
    nextBestAction: "",
    pending: true,
  },
  {
    name: "Kopitiam Harmoni",
    sector: "F&B",
    sectorTone: "primary",
    location: "Kuala Lumpur (KL-05)",
    contactName: "Wei Ming",
    contactRole: "Head of Procurement",
    revenue: "RM 380k – 520k",
    tier: "Tier 3",
    risk: "Low",
    riskPct: 22,
    nextBestAction:
      "Introduce the premium bean line during next visit — aligns with their recent menu refresh.",
  },
  {
    name: "Sinar Mart",
    sector: "Retail",
    sectorTone: "secondary",
    location: "Bangi (NW-04)",
    contactName: "Nurul Aziz",
    contactRole: "Regional Manager",
    revenue: "RM 1.8M – 2.2M",
    tier: "Tier 2",
    risk: "Medium",
    riskPct: 38,
    nextBestAction:
      "Renewal window opens in 21 days. Prep tiered pricing deck before the next visit.",
  },
  {
    name: "Central Provisions",
    sector: "Wholesale",
    sectorTone: "outline",
    location: "Kuala Lumpur (KL-03)",
    contactName: "Ravi Kumar",
    contactRole: "Owner",
    revenue: "RM 220k – 340k",
    tier: "Tier 3",
    risk: "High",
    riskPct: 71,
    nextBestAction:
      "Visit frequency has dropped 60% — re-engage with a value-tier bundle proposal.",
  },
];

/* ─── Page ──────────────────────────────────────────────────────── */

export default function CustomersPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 md:px-10">
      <PageHeader
        eyebrow="Data Sync Active · 428 Records"
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
        <FilterChip label="Territory" value="North-West" />
        <FilterChip label="Sector" value="FMCG" />
        <button
          type="button"
          className="
            inline-flex cursor-pointer items-center gap-1 rounded-full
            border border-dashed border-white/20 px-3 py-1.5
            font-mono text-[10px] uppercase tracking-[0.14em]
            text-on-surface-variant transition-colors
            hover:border-white/40 hover:text-on-surface
          "
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} /> Add filter
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {CUSTOMERS.map((c) => (
          <CustomerCardView key={c.name} customer={c} />
        ))}
      </div>
    </div>
  );
}

/* ─── Atoms ─────────────────────────────────────────────────────── */

function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-surface-variant/30 px-3 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
        {label}:
      </span>
      <span className="text-sm text-on-surface">{value}</span>
      <button
        type="button"
        aria-label={`Clear ${label} filter`}
        className="text-on-surface-variant transition-colors hover:text-primary"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function CustomerCardView({ customer }: { customer: CustomerCard }) {
  const sectorClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    outline: "bg-outline/10 text-on-surface-variant border-outline/20",
  }[customer.sectorTone];

  const riskTone = {
    Low: "text-primary",
    Medium: "text-tertiary",
    High: "text-error",
  }[customer.risk];

  const riskBar = {
    Low: "bg-primary",
    Medium: "bg-tertiary",
    High: "bg-gradient-to-r from-error to-tertiary",
  }[customer.risk];

  const tierTone = {
    "Tier 1": "text-primary",
    "Tier 2": "text-tertiary",
    "Tier 3": "text-on-surface-variant",
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
              {customer.name}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${sectorClasses}`}
            >
              {customer.sector}
            </span>
          </div>
          <p className="inline-flex items-center gap-1 text-sm text-on-surface-variant">
            <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
            {customer.location}
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
            Primary Contact
          </p>
          <p className="text-sm text-on-surface">{customer.contactName}</p>
          <p className="text-xs text-on-surface-variant">
            {customer.contactRole}
          </p>
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            Est. Revenue
          </p>
          <p className="text-sm text-on-surface">{customer.revenue}</p>
          <p className={`text-xs ${tierTone}`}>{customer.tier}</p>
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
            {customer.risk} ({customer.riskPct}%)
          </p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-variant">
          <div
            className={`h-full ${riskBar}`}
            style={{ width: `${customer.riskPct}%` }}
          />
        </div>
      </div>

      {/* Next best action */}
      <div
        className={`
          flex items-start gap-3 rounded-lg border border-primary/20
          bg-primary/5 p-3 shadow-ai-glow
          ${customer.pending ? "opacity-70" : ""}
        `}
      >
        <Sparkles
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            customer.pending ? "text-on-surface-variant" : "text-primary"
          }`}
          strokeWidth={2.25}
        />
        <div className="min-w-0">
          <p
            className={`mb-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
              customer.pending ? "text-on-surface-variant" : "text-primary"
            }`}
          >
            {customer.pending ? "Processing Insight…" : "Next Best Action"}
          </p>
          {customer.pending ? (
            <div className="space-y-1.5">
              <div className="h-2 w-3/4 animate-pulse rounded bg-surface-variant/60" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-surface-variant/60" />
            </div>
          ) : (
            <p className="text-sm leading-snug text-on-surface">
              {customer.nextBestAction}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
}
