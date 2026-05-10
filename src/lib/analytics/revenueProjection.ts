/**
 * Revenue projection utilities.
 *
 * Deterministic projections used by the KPI_Dashboard and the revenue
 * analytics charts. The numbers here are explicitly heuristic — the spec
 * scopes this MVP to current-session analytics only — but they give the
 * AI insights a grounded numeric frame to reason about.
 */

import type { RankedCustomer } from "../../types/customer";
import type { RevenueProjection } from "../../types/analytics";

/** Baseline close-rate assumptions per priority tier. */
export const CLOSE_RATE = {
  High: 0.45,
  Medium: 0.25,
  Low: 0.1,
} as const;

export function revenueProjection(customers: RankedCustomer[]): RevenueProjection {
  if (customers.length === 0) {
    return {
      expectedRevenue: 0,
      upsideRevenue: 0,
      floorRevenue: 0,
      assumedCloseRate: 0,
    };
  }

  let expected = 0;
  let upside = 0;
  let floor = 0;

  for (const c of customers) {
    const tierRate = CLOSE_RATE[c.tier];
    expected += c.sales_value * tierRate;
    upside += c.sales_value;
    if (c.tier === "High") floor += c.sales_value * CLOSE_RATE.High;
  }

  const weightedRate =
    customers.reduce((sum, c) => sum + CLOSE_RATE[c.tier], 0) / customers.length;

  return {
    expectedRevenue: Math.round(expected),
    upsideRevenue: Math.round(upside),
    floorRevenue: Math.round(floor),
    assumedCloseRate: Math.round(weightedRate * 100) / 100,
  };
}
