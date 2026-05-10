"use client";

/**
 * InsightsStrip
 *
 * Horizontally-scrolling strip of AI-generated territory insights. Sits
 * below the KPI bar on the dashboard and consumes `useAIStore.insights`.
 * While the pipeline runs, renders a row of shimmer cards so the surface
 * never blanks out.
 */

import { motion } from "framer-motion";
import { AlertTriangle, Sparkles, Target, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SkeletonCard, SkeletonLine } from "@/components/SkeletonCard";
import { useAIStore } from "@/store/ai-store";
import type { AIInsight } from "@/types/ai";

const CATEGORY_META: Record<
  AIInsight["category"],
  { icon: LucideIcon; label: string }
> = {
  opportunity: { icon: TrendingUp, label: "Opportunity" },
  risk: { icon: AlertTriangle, label: "Risk" },
  strategy: { icon: Target, label: "Strategy" },
  route_reasoning: { icon: Sparkles, label: "Route" },
  daily_brief: { icon: Sparkles, label: "Brief" },
};

const SEVERITY_TONE: Record<AIInsight["severity"], string> = {
  positive: "border-emerald-500/20 text-emerald-300",
  warning: "border-amber-500/20 text-amber-300",
  critical: "border-red-500/20 text-red-300",
  info: "border-blue-500/20 text-blue-300",
};

export function InsightsStrip() {
  const insights = useAIStore((s) => s.insights);
  const isGenerating = useAIStore((s) => s.isGeneratingInsights);

  if (isGenerating && insights.length === 0) {
    return (
      <section
        aria-label="AI insights"
        aria-busy="true"
        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-[112px]">
            <SkeletonLine className="h-2.5 w-20" />
            <SkeletonLine className="h-3 w-40" />
            <SkeletonLine className="h-2 w-full" />
          </SkeletonCard>
        ))}
      </section>
    );
  }

  if (insights.length === 0) return null;

  return (
    <section
      aria-label="AI insights"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
    >
      {insights.slice(0, 4).map((insight, idx) => (
        <InsightCard key={insight.id} insight={insight} index={idx} />
      ))}
    </section>
  );
}

function InsightCard({ insight, index }: { insight: AIInsight; index: number }) {
  const meta = CATEGORY_META[insight.category] ?? CATEGORY_META.strategy;
  const tone = SEVERITY_TONE[insight.severity];
  const Icon = meta.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
      className={`
        flex h-full flex-col gap-2 rounded-xl border bg-zinc-900/50 p-4
        backdrop-blur-md transition-colors hover:bg-zinc-900/70
        ${tone}
      `}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
          {meta.label}
        </span>
      </div>
      <h4 className="text-sm font-semibold tracking-tight text-zinc-100">
        {insight.title}
      </h4>
      <p className="flex-1 text-xs leading-relaxed text-zinc-400">
        {insight.body}
      </p>
    </motion.article>
  );
}

export default InsightsStrip;
