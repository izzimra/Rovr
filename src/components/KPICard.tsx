"use client";

/**
 * KPICard
 *
 * A single premium glassmorphism KPI tile for the Rovr dashboard.
 *
 * Visual grammar (see `.kiro/specs/rovr-frontend-polish/requirements.md`
 * Requirements 2 & 4):
 *   - Deep glass surface: `bg-zinc-900/50 backdrop-blur-md border-white/5`
 *   - Electric blue → purple accent gradient on the icon chip
 *   - Framer Motion lift on hover (translateY, not scale — never shifts layout)
 *   - Glowing box-shadow on hover using the accent color
 *   - Tight, Linear-style typography: small uppercase label, dense display value
 *
 * This component is presentation only. It accepts a fully formatted `value`
 * string so the caller owns locale / currency / unit formatting.
 */

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";

export type KPIAccent = "blue" | "violet" | "cyan" | "fuchsia";

export interface KPICardProps {
  /** Short label, e.g. "Estimated Revenue". Rendered in uppercase. */
  label: string;
  /** Pre-formatted value, e.g. "RM 48,250" or "94%". */
  value: string;
  /** Optional secondary delta/hint line, e.g. "+12% vs yesterday". */
  hint?: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Accent color for the icon chip and hover glow. */
  accent?: KPIAccent;
}

/**
 * Map from accent key to the pair of Tailwind classes / rgba values we need.
 * Keeping this as a static map (not string interpolation) so Tailwind's JIT
 * sees every class literal at build time.
 */
const ACCENT_STYLES: Record<
  KPIAccent,
  {
    /** Icon chip gradient + text color. */
    chip: string;
    /** Hover glow — rgba kept here so Framer Motion can animate it. */
    glow: string;
  }
> = {
  blue: {
    chip: "bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20",
    glow: "0 0 24px 0 rgba(59, 130, 246, 0.35)", // blue-500
  },
  violet: {
    chip: "bg-violet-500/10 text-violet-400 ring-1 ring-inset ring-violet-500/20",
    glow: "0 0 24px 0 rgba(139, 92, 246, 0.35)", // violet-500
  },
  cyan: {
    chip: "bg-cyan-500/10 text-cyan-400 ring-1 ring-inset ring-cyan-500/20",
    glow: "0 0 24px 0 rgba(34, 211, 238, 0.35)", // cyan-400
  },
  fuchsia: {
    chip: "bg-fuchsia-500/10 text-fuchsia-400 ring-1 ring-inset ring-fuchsia-500/20",
    glow: "0 0 24px 0 rgba(217, 70, 239, 0.35)", // fuchsia-500
  },
};

export function KPICard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "blue",
}: KPICardProps) {
  const accentStyle = ACCENT_STYLES[accent];

  return (
    <motion.div
      // Subtle lift on hover. TranslateY only — never scale — so the
      // adjacent grid neighbors stay anchored (Requirement 3.7).
      whileHover={{
        y: -2,
        boxShadow: accentStyle.glow,
      }}
      transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
      className="h-full"
    >
      <Card className="flex h-full flex-col justify-between gap-3 border-white/5 bg-zinc-900/50 p-4 backdrop-blur-md">
        {/* Row 1 — label + icon chip */}
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            {label}
          </span>

          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accentStyle.chip}`}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>

        {/* Row 2 — value + optional delta */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold leading-none tracking-tight text-zinc-50 tabular-nums">
            {value}
          </span>
          {hint ? (
            <span className="text-xs font-medium text-zinc-500">{hint}</span>
          ) : null}
        </div>
      </Card>
    </motion.div>
  );
}

export default KPICard;
