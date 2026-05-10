/**
 * Produce a fully-ranked customer list from a raw Customer[] input.
 *
 * This is the deterministic baseline ranker. It always runs, even when
 * Gemini is unavailable. The AI prioritization service later merges its
 * explanations on top of these records.
 */

import type { Customer, RankedCustomer } from "../../types/customer";
import {
  DEFAULT_ORIGIN,
  buildScoringContext,
  calculateScore,
  tierFor,
} from "./calculateScore";

export interface RankOptions {
  origin?: { latitude: number; longitude: number };
}

export function rankCustomers(
  customers: Customer[],
  options: RankOptions = {},
): RankedCustomer[] {
  if (customers.length === 0) return [];

  const ctx = buildScoringContext(customers, options.origin ?? DEFAULT_ORIGIN);

  const scored = customers.map((customer) => {
    const score = calculateScore(customer, ctx);
    const tier = tierFor(customer.priority);
    return {
      ...customer,
      score,
      tier,
      rank: 0,
      explanation: deterministicExplanation(customer, score, tier),
    } satisfies RankedCustomer;
  });

  // Sort by score desc, break ties with priority then sales_value.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.sales_value - a.sales_value;
  });

  return scored.map((c, idx) => ({ ...c, rank: idx + 1 }));
}

/**
 * Fallback explanation used when Gemini hasn't produced reasoning yet.
 * Deliberately short and numeric so it still reads as "executive" in the UI.
 */
function deterministicExplanation(
  customer: Customer,
  score: number,
  tier: RankedCustomer["tier"],
): string {
  const staleness =
    customer.last_visit_days >= 30
      ? `overdue (${customer.last_visit_days}d since visit)`
      : `visited ${customer.last_visit_days}d ago`;
  return `${tier} tier, score ${score.toFixed(1)}. RM${customer.sales_value.toLocaleString()} pipeline, ${staleness}.`;
}
