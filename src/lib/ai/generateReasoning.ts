/**
 * AI reasoning services.
 *
 * Attach Gemini-authored justifications to ranked customers and produce
 * route-level reasoning for the map/insights panel. Both services degrade
 * gracefully: on Gemini failure the caller keeps Gemini-independent copy
 * that still cites real numbers.
 */

import type { RankedCustomer } from "../../types/customer";
import type { OptimizedRoute, RouteInsight } from "../../types/route";
import {
  explainCustomerWithGemini,
  generateRouteReasoningWithGemini,
} from "../gemini/services";
import {
  CallTrace,
  classifyError,
  hasGeminiApiKey,
} from "../gemini/helpers";
import { formatDuration, formatRinggit } from "./insightFormatter";
import { classifyTerritory } from "./context";

export interface CustomerReasoningOptions {
  /** Hard cap on parallel Gemini calls to stay inside rate limits. */
  concurrency?: number;
  /** Only hydrate the top-N customers; the rest keep deterministic copy. */
  topN?: number;
  /** Optional shared trace so observability metadata aggregates cleanly. */
  trace?: CallTrace;
}

export interface RouteReasoningResult {
  insight: RouteInsight;
  trace: CallTrace;
}

/**
 * Populate `explanation` for the top-ranked customers using Gemini.
 *
 * Resilient: a failure on any single customer leaves the deterministic
 * explanation the ranker already set. When no API key is present, this
 * function is a no-op and the shared trace is marked accordingly.
 */
export async function explainCustomerPriorities(
  customers: RankedCustomer[],
  options: CustomerReasoningOptions = {},
): Promise<RankedCustomer[]> {
  const trace = options.trace ?? new CallTrace();
  const topN = Math.min(options.topN ?? 10, customers.length);
  const concurrency = Math.max(1, options.concurrency ?? 3);

  if (!hasGeminiApiKey()) {
    trace.markFallback("no_api_key");
    return customers;
  }

  const targets = customers.slice(0, topN);
  const out = [...customers];
  let anyFailed = false;
  let lastError: unknown;

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((c) => explainCustomerWithGemini(c, trace)),
    );

    results.forEach((res, idx) => {
      const target = out[i + idx];
      if (!target) return;
      if (res.status === "fulfilled" && res.value.trim().length > 0) {
        out[i + idx] = { ...target, explanation: res.value };
      } else {
        anyFailed = true;
        if (res.status === "rejected") lastError = res.reason;
      }
    });
  }

  if (anyFailed) {
    trace.markFallback(classifyError(lastError));
  }

  return out;
}

/**
 * Generate narrative route reasoning. Always returns a usable payload:
 * on Gemini failure a deterministic insight takes over, voiced like a
 * regional operations director.
 */
export async function generateRouteReasoningWithTrace(
  route: OptimizedRoute,
): Promise<RouteReasoningResult> {
  const trace = new CallTrace();

  if (route.stops.length === 0) {
    trace.markFallback("insufficient_context");
    return {
      insight: {
        headline: "No optimized route in the current session.",
        reasoning:
          "Optimisation has not been executed for the current accounts. Upload a CSV or activate Demo Mode to generate a live route.",
        highlights: [],
      },
      trace,
    };
  }

  if (!hasGeminiApiKey()) {
    trace.markFallback("no_api_key");
    return { insight: buildDeterministicRouteInsight(route), trace };
  }

  try {
    const insight = await generateRouteReasoningWithGemini(route, trace);
    return { insight, trace };
  } catch (err) {
    trace.markFallback(classifyError(err));
    return { insight: buildDeterministicRouteInsight(route), trace };
  }
}

export async function generateRouteReasoning(
  route: OptimizedRoute,
): Promise<RouteInsight> {
  const { insight } = await generateRouteReasoningWithTrace(route);
  return insight;
}

function buildDeterministicRouteInsight(route: OptimizedRoute): RouteInsight {
  const topStop = route.stops[0];
  const stopCount = route.stops.length;
  const totalRevenue = route.stops.reduce(
    (sum, s) => sum + s.customer.sales_value,
    0,
  );
  const revenuePerHour =
    route.totalDurationMinutes > 0
      ? Math.round(totalRevenue / (route.totalDurationMinutes / 60))
      : 0;

  const firstHalfStops = route.stops.slice(0, Math.ceil(stopCount / 2));
  const firstHalfRevenue = firstHalfStops.reduce(
    (sum, s) => sum + s.customer.sales_value,
    0,
  );
  const firstHalfShare = Math.round((firstHalfRevenue / Math.max(totalRevenue, 1)) * 100);

  const highlights: string[] = [
    `${stopCount} stops across ${route.totalDistanceKm.toFixed(1)} km in ${formatDuration(route.totalDurationMinutes)}.`,
    `Revenue density: ${formatRinggit(revenuePerHour)} per hour of drive time.`,
    `First half of the route captures ${firstHalfShare}% of routed revenue — insulates quota against afternoon slippage.`,
  ];
  if (topStop) {
    const territory = classifyTerritory(
      topStop.customer.latitude,
      topStop.customer.longitude,
    );
    highlights.push(
      `Opening with ${topStop.customer.customer_name} (${topStop.customer.tier}) in ${territory} — ${formatRinggit(topStop.customer.sales_value)} pipeline.`,
    );
  }

  return {
    headline: "Sequence prioritises revenue density over raw distance.",
    reasoning:
      "The visit order front-loads High-tier accounts and consolidates the cluster with the highest pipeline concentration, trading a small amount of extra travel for disproportionate revenue exposure in the morning window.",
    highlights: highlights.slice(0, 4),
  };
}
