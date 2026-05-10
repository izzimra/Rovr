/**
 * Insight generation service.
 *
 * Wraps the Gemini insights call and composes a complete four-card panel.
 * When Gemini is unavailable, deterministic cards take over — all of them
 * grounded in the rep's current data, all written in the same regional
 * sales director voice so the fallback feels indistinguishable from live
 * output.
 */

import type { RankedCustomer } from "../../types/customer";
import type { OptimizedRoute } from "../../types/route";
import type { KPIData } from "../../types/analytics";
import type { AIInsight } from "../../types/ai";
import { generateInsightsWithGemini } from "../gemini/services";
import { CallTrace, classifyError, hasGeminiApiKey } from "../gemini/helpers";
import { buildFallbackInsight, formatRinggit } from "./insightFormatter";
import { classifyTerritory, describeClusters } from "./context";

export interface InsightInputs {
  customers: RankedCustomer[];
  route?: OptimizedRoute;
  kpis?: KPIData;
}

export interface InsightsResult {
  insights: AIInsight[];
  trace: CallTrace;
}

export async function generateInsightsWithTrace(
  inputs: InsightInputs,
): Promise<InsightsResult> {
  const trace = new CallTrace();
  const { customers, route, kpis } = inputs;

  if (customers.length === 0) {
    trace.markFallback("insufficient_context");
    return {
      insights: [
        buildFallbackInsight(
          "strategy",
          "Territory awaiting today's dataset",
          "No accounts are loaded for the current session. Upload a CSV or activate Demo Mode to unlock live territory intelligence.",
        ),
      ],
      trace,
    };
  }

  if (!hasGeminiApiKey()) {
    trace.markFallback("no_api_key");
    return {
      insights: buildDeterministicInsights(customers, route, kpis),
      trace,
    };
  }

  try {
    const live = await generateInsightsWithGemini(customers, route, kpis, trace);
    if (live.length >= 3) return { insights: live, trace };

    // Pad with deterministic cards if Gemini returned too few.
    return {
      insights: [...live, ...buildDeterministicInsights(customers, route, kpis)].slice(0, 4),
      trace,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[insights] gemini error:", err);
    trace.markFallback(classifyError(err));
    return {
      insights: buildDeterministicInsights(customers, route, kpis),
      trace,
    };
  }
}

export async function generateInsights(inputs: InsightInputs): Promise<AIInsight[]> {
  const { insights } = await generateInsightsWithTrace(inputs);
  return insights;
}

// --- Deterministic cards ------------------------------------------------

function buildDeterministicInsights(
  customers: RankedCustomer[],
  route: OptimizedRoute | undefined,
  kpis: KPIData | undefined,
): AIInsight[] {
  const top = customers[0];
  const clusters = describeClusters(customers);
  const leadCluster = clusters[0];
  const stale = customers
    .filter((c) => c.last_visit_days >= 30)
    .sort((a, b) => b.last_visit_days - a.last_visit_days)
    .slice(0, 3);
  const highCount = customers.filter((c) => c.tier === "High").length;
  const insights: AIInsight[] = [];

  if (top) {
    const territory = classifyTerritory(top.latitude, top.longitude);
    insights.push(
      buildFallbackInsight(
        "opportunity",
        `${top.customer_name} is today's revenue anchor`,
        `Prioritise ${top.customer_name} in ${territory} — ${top.tier} tier, ${formatRinggit(top.sales_value)} pipeline, composite score ${top.score.toFixed(1)}. Open the day here to compound downstream cluster value.`,
        "positive",
      ),
    );
  }

  if (stale.length > 0) {
    insights.push(
      buildFallbackInsight(
        "risk",
        `${stale.length} account${stale.length === 1 ? "" : "s"} drifting past renewal window`,
        `${stale.map((s) => `${s.customer_name} (${s.last_visit_days}d)`).join(", ")} are past the 30-day freshness window. Sequence at least one touch this week to neutralise renewal risk.`,
        stale.length >= 3 ? "critical" : "warning",
      ),
    );
  } else {
    insights.push(
      buildFallbackInsight(
        "risk",
        "Territory freshness within control band",
        `No accounts exceed the 30-day freshness window. Maintain cadence on Medium-tier accounts to prevent slippage.`,
        "info",
      ),
    );
  }

  if (leadCluster && leadCluster.count >= 2) {
    const density = leadCluster.count
      ? Math.round(leadCluster.totalValue / leadCluster.count)
      : 0;
    insights.push(
      buildFallbackInsight(
        "strategy",
        `Concentrate execution in ${leadCluster.name}`,
        `${leadCluster.name} holds ${leadCluster.count} accounts representing ${formatRinggit(leadCluster.totalValue)} of pipeline (avg ${formatRinggit(density)} per stop). Sequence the cluster as the morning block.`,
        "info",
      ),
    );
  } else {
    insights.push(
      buildFallbackInsight(
        "strategy",
        `Focus execution on ${highCount} High-tier accounts`,
        kpis
          ? `Projected revenue ${formatRinggit(kpis.estimatedRevenue)} at ${kpis.optimizationPercent}% route optimisation. High-tier accounts carry the fastest path to quota today.`
          : `High-tier accounts carry the fastest path to quota. Queue deeper discovery on Medium tier only once High-tier touches are secured.`,
        "info",
      ),
    );
  }

  if (route && route.stops.length > 0) {
    const routedRevenue = route.stops.reduce(
      (sum, s) => sum + s.customer.sales_value,
      0,
    );
    const firstHalfRevenue = route.stops
      .slice(0, Math.ceil(route.stops.length / 2))
      .reduce((sum, s) => sum + s.customer.sales_value, 0);
    const firstHalfShare = Math.round((firstHalfRevenue / Math.max(routedRevenue, 1)) * 100);
    insights.push(
      buildFallbackInsight(
        "route_reasoning",
        "Sequence concentrates revenue in the first half of the day",
        `${route.stops.length} stops across ${route.totalDistanceKm.toFixed(1)}km in ${route.totalDurationMinutes} min. First half of the route captures ${firstHalfShare}% of routed revenue — protects quota even if the afternoon slips.`,
        "positive",
      ),
    );
  } else {
    insights.push(
      buildFallbackInsight(
        "route_reasoning",
        "Route optimisation pending",
        "Activate route optimisation to see per-leg travel estimates, clustered revenue density, and High-tier coverage.",
        "info",
      ),
    );
  }

  return insights.slice(0, 4);
}
