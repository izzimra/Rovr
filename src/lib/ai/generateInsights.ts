/**
 * Insight generation service.
 *
 * Wraps the Gemini insights call with a deterministic fallback so the
 * insights panel always renders at least 4 cards. The fallback is
 * grounded in the same customer/route/KPI inputs so the content remains
 * truthful even without the AI layer.
 */

import type { RankedCustomer } from "../../types/customer";
import type { OptimizedRoute } from "../../types/route";
import type { KPIData } from "../../types/analytics";
import type { AIInsight } from "../../types/ai";
import { generateInsightsWithGemini } from "../gemini/services";
import { buildFallbackInsight, formatRinggit } from "./insightFormatter";

export interface InsightInputs {
  customers: RankedCustomer[];
  route?: OptimizedRoute;
  kpis?: KPIData;
}

export async function generateInsights(inputs: InsightInputs): Promise<AIInsight[]> {
  const { customers, route, kpis } = inputs;

  if (customers.length === 0) {
    return [
      buildFallbackInsight(
        "strategy",
        "Awaiting customer data",
        "Upload a CSV or enable Demo Mode to unlock AI business insights.",
      ),
    ];
  }

  try {
    const insights = await generateInsightsWithGemini(customers, route, kpis);
    if (insights.length >= 3) return insights;
    return [...insights, ...buildFallbackInsights(customers, route, kpis)].slice(0, 4);
  } catch {
    return buildFallbackInsights(customers, route, kpis);
  }
}

function buildFallbackInsights(
  customers: RankedCustomer[],
  route: OptimizedRoute | undefined,
  kpis: KPIData | undefined,
): AIInsight[] {
  const top = customers[0];
  const highCount = customers.filter((c) => c.tier === "High").length;
  const stale = customers.filter((c) => c.last_visit_days >= 30).slice(0, 3);

  const insights: AIInsight[] = [];

  if (top) {
    insights.push(
      buildFallbackInsight(
        "opportunity",
        `${top.customer_name} leads today's pipeline`,
        `${top.tier} tier at ${formatRinggit(top.sales_value)} with score ${top.score.toFixed(1)}. Prioritise the opener.`,
        "positive",
      ),
    );
  }

  if (stale.length > 0) {
    insights.push(
      buildFallbackInsight(
        "risk",
        `${stale.length} accounts going stale`,
        `${stale.map((s) => s.customer_name).join(", ")} last visited 30+ days ago. Schedule touches this week.`,
        "warning",
      ),
    );
  }

  if (route && route.stops.length > 0) {
    insights.push(
      buildFallbackInsight(
        "route_reasoning",
        "Route front-loads highest-tier stops",
        `${route.stops.length} stops, ${route.totalDistanceKm.toFixed(1)}km, ${route.totalDurationMinutes}min. High-tier customers sit in the first half of the sequence.`,
      ),
    );
  }

  insights.push(
    buildFallbackInsight(
      "strategy",
      `Focus energy on ${highCount} High-tier accounts`,
      kpis
        ? `Projected revenue ${formatRinggit(kpis.estimatedRevenue)} at ${kpis.optimizationPercent}% optimization. Double down on High tier for today.`
        : `High tier represents the fastest path to quota. Queue deeper discovery on Medium tier only after.`,
      "info",
    ),
  );

  return insights.slice(0, 4);
}
