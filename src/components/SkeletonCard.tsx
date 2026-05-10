"use client";

/**
 * SkeletonCard
 *
 * Premium loading affordance for the Rovr dashboard.
 *
 * Visual grammar (see `.kiro/specs/rovr-frontend-polish/requirements.md`
 * Requirement 8):
 *   - Deep glass base (`bg-zinc-900/60 border-white/5`) so the skeleton
 *     blends with the real surface it's standing in for.
 *   - A Framer Motion shimmer sweep in electric blue / violet, not a flat
 *     gray bar. Masked to the card bounds so the glow doesn't bleed.
 *   - Respects `prefers-reduced-motion: reduce` — static pulse only.
 *
 * The default export is the base `SkeletonCard`. `SkeletonLine` and
 * `SkeletonBlock` are tiny wrappers that reuse the same shimmer treatment
 * at different dimensions so a whole panel's skeleton can be composed
 * without repeating the gradient math.
 */

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/* ─── Motion tokens ─────────────────────────────────────────────── */

/** Shared shimmer sweep — translates a narrow gradient band across the card. */
const shimmerSweep = {
  initial: { x: "-100%" },
  animate: { x: "100%" },
  transition: {
    duration: 1.6,
    ease: "linear",
    repeat: Infinity,
    repeatDelay: 0.4,
  },
} as const;

/* ─── Base ──────────────────────────────────────────────────────── */

interface SkeletonCardProps {
  className?: string;
  children?: ReactNode;
  /** Optional ARIA label for screen readers. */
  label?: string;
}

/**
 * Base glass skeleton. Compose your own layout inside via `children`, or
 * use `SkeletonLine` / `SkeletonBlock` for ready-made shapes.
 */
export function SkeletonCard({
  className = "h-24 w-full",
  children,
  label = "Loading",
}: SkeletonCardProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={`
        relative overflow-hidden rounded-xl border border-white/5
        bg-zinc-900/60 backdrop-blur-md
        motion-safe:animate-none motion-reduce:animate-pulse
        ${className}
      `}
    >
      {/* Base tone layer — subtle vertical gradient for depth. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent"
        aria-hidden="true"
      />

      {/* Shimmer sweep — hidden entirely under reduced-motion. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-0 w-1/2 motion-reduce:hidden"
        initial={shimmerSweep.initial}
        animate={shimmerSweep.animate}
        transition={shimmerSweep.transition}
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.08) 40%, rgba(139,92,246,0.12) 55%, transparent 100%)",
        }}
      />

      {/* Caller-provided structure sits on top of the shimmer. */}
      {children ? (
        <div className="relative z-10 flex h-full flex-col justify-between gap-2 p-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Composable building blocks ────────────────────────────────── */

/** A single shimmering line — use for titles, values, snippets. */
export function SkeletonLine({
  className = "h-3 w-24",
}: {
  className?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-md bg-white/5
        motion-reduce:animate-pulse
        ${className}
      `}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-y-0 w-1/2 motion-reduce:hidden"
        initial={shimmerSweep.initial}
        animate={shimmerSweep.animate}
        transition={shimmerSweep.transition}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(96,165,250,0.25), transparent)",
        }}
      />
    </div>
  );
}

/** A larger shimmering block — use for avatars, thumbnails, charts. */
export function SkeletonBlock({
  className = "h-16 w-full",
}: {
  className?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-lg bg-white/5
        motion-reduce:animate-pulse
        ${className}
      `}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-y-0 w-1/2 motion-reduce:hidden"
        initial={shimmerSweep.initial}
        animate={shimmerSweep.animate}
        transition={shimmerSweep.transition}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(139,92,246,0.18), transparent)",
        }}
      />
    </div>
  );
}

export default SkeletonCard;
