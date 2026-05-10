/**
 * KPI generator for the KPI_Dashboard.
 *
 * Composes the efficiency + revenue projection + scoring layers into the
 * exact `KPIData` shape the dashboard renders. When a route hasn't been
 * optimized yet, the generator still returns a sensible pipeline-only view
 * so the dashboard never renders blank tiles.
 */

import type { RankedCustomer } from "../../types/customer";
import type { OptimizedRoute } from "../../types/route";
import type { KPIData } from "../../types/analytics";
import {
  calculateEfficiency,
  calculateTravelSavings,
} from "./calculateEfficiency";
import { revenueProjection } from "./revenueProjection";

export interface KpiInputs {
  customers: RankedCustomer[];
  route?: OptimizedRoute;
  /**
   * Total duration (minutes) of the naive priority-only sequence,
   * used to compute "Travel Saved". Supplied by the Route_Optimizer.
   */
  baselineRouteDurationMinutes?: number;
}

export function generateKPIs(inputs: KpiInputs): KPIData {
  const { customers, route, baselineRouteDurationMinutes } = inputs;

  if (!route || route.stops.length === 0) {
    const projection = revenueProjection(customers);
    return {
      estimatedRevenue: projection.expectedRevenue,
      routeEfficiency: 0,
      travelSavedMinutes: 0,
      priorityCustomers: customers.filter((c) => c.tier === "High").length,
      opportunityScore: composeOpportunityScore(customers, 0),
      optimizationPercent: 0,
    };
  }

  const routedCustomers = route.stops.map((s) => s.customer);
  const estimatedRevenue = routedCustomers.reduce(
    (sum, c) => sum + c.sales_value,
    0,
  );
  const efficiency = calculateEfficiency(route);

  const { travelSavedMinutes, optimizationPercent } = calculateTravelSavings(
    route,
    baselineRouteDurationMinutes ?? route.totalDurationMinutes,
  );

  const priorityCustomers = routedCustomers.filter(
    (c) => c.tier === "High",
  ).length;

  return {
    estimatedRevenue,
    routeEfficiency: efficiency.revenuePerHour,
    travelSavedMinutes,
    priorityCustomers,
    opportunityScore: composeOpportunityScore(routedCustomers, optimizationPercent),
    optimizationPercent,
  };
}

/**
 * Blend average customer score with route optimization percent to produce
 * a single 0–100 "opportunity score" tile.
 */
function composeOpportunityScore(
  customers: RankedCustomer[],
  optimizationPercent: number,
): number {
  if (customers.length === 0) return 0;
  const avgScore =
    customers.reduce((sum, c) => sum + c.score, 0) / customers.length;
  const blended = avgScore * 0.7 + optimizationPercent * 0.3;
  return Math.round(Math.max(0, Math.min(100, blended)));
}
