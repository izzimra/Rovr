/**
 * AI reasoning services.
 *
 * Attach Gemini-authored explanations to ranked customers and produce
 * route-level reasoning for the map/insights panel. Both services fall
 * back to deterministic copy when Gemini is unavailable.
 */

import type { RankedCustomer } from "../../types/customer";
import type { OptimizedRoute, RouteInsight } from "../../types/route";
import {
  explainCustomerWithGemini,
  generateRouteReasoningWithGemini,
} from "../gemini/services";
import { formatDuration } from "./insightFormatter";

export interface CustomerReasoningOptions {
  /** Hard cap on parallel Gemini calls to stay inside rate limits. */
  concurrency?: number;
  /** Only hydrate the top-N customers; the rest keep deterministic copy. */
  topN?: number;
}

/**
 * Populate `explanation` for the top-ranked customers using Gemini.
 *
 * The function is resilient: a failure on any single customer reverts
 * that record to the deterministic explanation the ranker already set.
 */
export async function explainCustomerPriorities(
  customers: RankedCustomer[],
  options: CustomerReasoningOptions = {},
): Promise<RankedCustomer[]> {
  const topN = Math.min(options.topN ?? 10, customers.length);
  const concurrency = Math.max(1, options.concurrency ?? 3);

  const targets = customers.slice(0, topN);
  const out = [...customers];

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((c) => explainCustomerWithGemini(c)),
    );

    results.forEach((res, idx) => {
      const base = batch[idx];
      if (!base) return;
      const target = out[i + idx];
      if (!target) return;
      if (res.status === "fulfilled" && res.value.trim().length > 0) {
        out[i + idx] = { ...target, explanation: res.value };
      }
      // On rejection, keep the deterministic explanation in-place.
    });
  }

  return out;
}

/**
 * Generate narrative route reasoning, with a deterministic fallback that
 * cites actual numbers from the route.
 */
export async function generateRouteReasoning(
  route: OptimizedRoute,
): Promise<RouteInsight> {
  if (route.stops.length === 0) {
    return {
      headline: "No optimized route yet.",
      reasoning: "Upload customers or enable Demo Mode to generate a route.",
      highlights: [],
    };
  }

  try {
    return await generateRouteReasoningWithGemini(route);
  } catch {
    return buildFallbackRouteReasoning(route);
  }
}

function buildFallbackRouteReasoning(route: OptimizedRoute): RouteInsight {
  const topStop = route.stops[0];
  const stopCount = route.stops.length;
  const totalRevenue = route.stops.reduce((sum, s) => sum + s.customer.sales_value, 0);
  const revenuePerHour =
    route.totalDurationMinutes > 0
      ? Math.round((totalRevenue / (route.totalDurationMinutes / 60)))
      : 0;

  const highlights = [
    `${stopCount} stops across ${route.totalDistanceKm.toFixed(1)} km in ${formatDuration(route.totalDurationMinutes)}.`,
    `Revenue density: RM${revenuePerHour.toLocaleString()} per hour of drive time.`,
  ];
  if (topStop) {
    highlights.push(
      `Leading with ${topStop.customer.customer_name} (${topStop.customer.tier} tier).`,
    );
  }

  return {
    headline: "Route prioritises revenue density over raw distance.",
    reasoning:
      "The sequence front-loads the highest-value customers while keeping travel time proportional to pipeline impact.",
    highlights,
  };
}
