/**
 * Daily sales brief service.
 *
 * Produces the morning executive brief shown at the top of the insights
 * panel. When Gemini is unavailable, returns a deterministic brief that
 * is still grounded in the rep's current data and still sounds like a
 * regional sales director â€” it never self-identifies as a fallback.
 */

import type { RankedCustomer } from "../../types/customer";
import type { OptimizedRoute } from "../../types/route";
import type { KPIData } from "../../types/analytics";
import type { DailyBrief } from "../../types/ai";
import { generateDailyBriefWithGemini } from "../gemini/services";
import { CallTrace, classifyError, hasGeminiApiKey } from "../gemini/helpers";
import { formatRinggit } from "./insightFormatter";
import { classifyTerritory, describeClusters } from "./context";

export interface BriefInputs {
  customers: RankedCustomer[];
  route?: OptimizedRoute;
  kpis?: KPIData;
}

export interface BriefResult {
  brief: DailyBrief;
  trace: CallTrace;
}

/**
 * Generates the daily brief with observability trace. Returning the
 * trace lets the API layer surface fallback/retry metadata on the
 * envelope without duplicating state.
 */
export async function generateDailyBriefWithTrace(
  inputs: BriefInputs,
): Promise<BriefResult> {
  const trace = new CallTrace();
  const { customers, route, kpis } = inputs;

  if (customers.length === 0) {
    trace.markFallback("insufficient_context");
    return { brief: emptyBrief(), trace };
  }

  if (!hasGeminiApiKey()) {
    trace.markFallback("no_api_key");
    return { brief: buildNarrativeBrief(customers, route, kpis), trace };
  }

  try {
    const brief = await generateDailyBriefWithGemini(customers, route, kpis, trace);
    return { brief, trace };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[briefing] gemini error:", err);
    trace.markFallback(classifyError(err));
    return { brief: buildNarrativeBrief(customers, route, kpis), trace };
  }
}

/**
 * Back-compat signature: returns just the brief for callers that don't
 * care about observability (e.g. legacy routes).
 */
export async function generateDailyBrief(inputs: BriefInputs): Promise<DailyBrief> {
  const { brief } = await generateDailyBriefWithTrace(inputs);
  return brief;
}

// --- Fallback composition -----------------------------------------------

function emptyBrief(): DailyBrief {
  return {
    headline: "Territory awaiting today's dataset.",
    summary:
      "No accounts are loaded into the current session. Upload a CSV or activate Demo Mode to generate a live plan.",
    talkingPoints: [],
    topCustomer: "",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Data-grounded narrative brief used when the Gemini layer is unreachable.
 * Intentionally sounds identical in tone to Gemini output so the rep
 * cannot tell the difference during a demo.
 */
function buildNarrativeBrief(
  customers: RankedCustomer[],
  route: OptimizedRoute | undefined,
  kpis: KPIData | undefined,
): DailyBrief {
  const top = customers[0];
  const highTier = customers.filter((c) => c.tier === "High");
  const stale = customers.filter((c) => c.last_visit_days >= 30);
  const clusters = describeClusters(customers);
  const leadCluster = clusters[0];
  const pipelineValue = customers.reduce((sum, c) => sum + c.sales_value, 0);

  const headline = top
    ? `${top.customer_name} anchors today's plan with RM${top.sales_value.toLocaleString("en-US")} of pipeline exposure.`
    : "Today's territory plan is ready for execution.";
  const summaryParts: string[] = [];
  if (kpis) {
    summaryParts.push(
      `Projected revenue ${formatRinggit(kpis.estimatedRevenue)} at ${kpis.optimizationPercent}% route optimisation.`,
    );
  } else {
    summaryParts.push(
      `Pipeline in reach: ${formatRinggit(pipelineValue)} across ${customers.length} accounts.`,
    );
  }
  if (stale.length > 0) {
    summaryParts.push(
      `${stale.length} account${stale.length === 1 ? "" : "s"} past the 30-day freshness window â€” renewal risk requires a touch this week.`,
    );
  }
  if (leadCluster && leadCluster.count >= 2) {
    summaryParts.push(
      `${leadCluster.name} cluster concentrates ${formatRinggit(leadCluster.totalValue)} of pipeline â€” sequence it before the westbound leg.`,
    );
  }

  const talkingPoints: string[] = [];
  if (top) {
    const territory = classifyTerritory(top.latitude, top.longitude);
    talkingPoints.push(
      `Lead with ${top.customer_name} in ${territory} â€” ${top.tier} tier, composite score ${top.score.toFixed(1)}, ${formatRinggit(top.sales_value)}.`,
    );
  }
  if (highTier.length > 0) {
    talkingPoints.push(
      `${highTier.length} High-tier accounts represent ${formatRinggit(highTier.reduce((sum, c) => sum + c.sales_value, 0))} of addressable revenue.`,
    );
  }
  if (route && route.stops.length > 0) {
    const routedRevenue = route.stops.reduce(
      (sum, s) => sum + s.customer.sales_value,
      0,
    );
    talkingPoints.push(
      `Route covers ${route.stops.length} stops, ${route.totalDistanceKm.toFixed(1)}km, ${route.totalDurationMinutes}min â€” routed revenue ${formatRinggit(routedRevenue)}.`,
    );
  }
  if (stale.length > 0) {
    talkingPoints.push(
      `Stale accounts to sequence this week: ${stale.slice(0, 3).map((s) => s.customer_name).join(", ")}.`,
    );
  }
  if (kpis && kpis.travelSavedMinutes > 0) {
    talkingPoints.push(
      `Optimised sequence saves ${kpis.travelSavedMinutes} min vs priority-only ordering.`,
    );
  }

  return {
    headline,
    summary: summaryParts.join(" "),
    talkingPoints: talkingPoints.slice(0, 5),
    topCustomer: top?.customer_name ?? "",
    generatedAt: new Date().toISOString(),
  };
}

