/**
 * Daily sales brief service.
 *
 * Produces the morning executive brief shown at the top of the insights
 * panel. Falls back to a deterministic, data-grounded brief if Gemini is
 * unreachable so the dashboard never renders blank.
 */

import type { RankedCustomer } from "../../types/customer";
import type { OptimizedRoute } from "../../types/route";
import type { KPIData } from "../../types/analytics";
import type { DailyBrief } from "../../types/ai";
import { generateDailyBriefWithGemini } from "../gemini/services";
import { formatRinggit } from "./insightFormatter";

export interface BriefInputs {
  customers: RankedCustomer[];
  route?: OptimizedRoute;
  kpis?: KPIData;
}

export async function generateDailyBrief(inputs: BriefInputs): Promise<DailyBrief> {
  const { customers, route, kpis } = inputs;

  if (customers.length === 0) {
    return {
      headline: "No customers loaded yet.",
      summary: "Upload a CSV or enable Demo Mode to generate today's plan.",
      talkingPoints: [],
      topCustomer: "",
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    return await generateDailyBriefWithGemini(customers, route, kpis);
  } catch {
    return buildFallbackBrief(customers, kpis);
  }
}

function buildFallbackBrief(
  customers: RankedCustomer[],
  kpis: KPIData | undefined,
): DailyBrief {
  const top = customers[0];
  const highTierCount = customers.filter((c) => c.tier === "High").length;
  const pipelineValue = customers.reduce((sum, c) => sum + c.sales_value, 0);

  const talkingPoints = [
    `${highTierCount} High-tier customers in today's plan.`,
    `Pipeline in reach: ${formatRinggit(pipelineValue)} across ${customers.length} accounts.`,
  ];
  if (kpis) {
    talkingPoints.push(
      `Expected revenue: ${formatRinggit(kpis.estimatedRevenue)} at ${kpis.optimizationPercent}% route optimization.`,
    );
  }
  if (top) {
    talkingPoints.push(
      `Lead with ${top.customer_name} (score ${top.score.toFixed(1)}, ${formatRinggit(top.sales_value)}).`,
    );
  }

  return {
    headline:
      top !== undefined
        ? `${top.customer_name} is today's highest-leverage visit.`
        : "Today's plan is ready to review.",
    summary:
      "This brief is a deterministic fallback — the Gemini narrative layer is momentarily unavailable, but all numbers below come directly from your current data.",
    talkingPoints,
    topCustomer: top?.customer_name ?? "",
    generatedAt: new Date().toISOString(),
  };
}
