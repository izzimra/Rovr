/**
 * Scoring-layer analytics.
 *
 * Aggregate statistics derived purely from a ranked customer list. Kept
 * separate from `lib/analytics/` so the KPI layer can layer route context
 * on top of these customer-only numbers.
 */

import type { RankedCustomer } from "../../types/customer";

export interface CustomerCohortStats {
  totalCustomers: number;
  totalPipelineValue: number;
  averageScore: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  staleCustomerCount: number;
}

/** Threshold (in days) at which a customer is considered "stale". */
export const STALE_THRESHOLD_DAYS = 30;

export function summarizeCohort(customers: RankedCustomer[]): CustomerCohortStats {
  const base: CustomerCohortStats = {
    totalCustomers: customers.length,
    totalPipelineValue: 0,
    averageScore: 0,
    highPriorityCount: 0,
    mediumPriorityCount: 0,
    lowPriorityCount: 0,
    staleCustomerCount: 0,
  };

  if (customers.length === 0) return base;

  let scoreSum = 0;
  for (const c of customers) {
    base.totalPipelineValue += c.sales_value;
    scoreSum += c.score;
    if (c.tier === "High") base.highPriorityCount += 1;
    else if (c.tier === "Medium") base.mediumPriorityCount += 1;
    else base.lowPriorityCount += 1;
    if (c.last_visit_days >= STALE_THRESHOLD_DAYS) base.staleCustomerCount += 1;
  }
  base.averageScore = Math.round((scoreSum / customers.length) * 100) / 100;
  return base;
}
