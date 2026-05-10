/**
 * Efficiency calculations for the KPI_Dashboard.
 *
 * Given an optimized route, derive the performance shape of today's plan:
 * revenue per hour, revenue per km, average minutes per stop, etc.
 */

import type { OptimizedRoute } from "../../types/route";
import type { EfficiencyBreakdown } from "../../types/analytics";

/** Minutes spent on-site per stop. Tunable; kept central for consistency. */
export const DEFAULT_DWELL_MINUTES_PER_STOP = 25;

export function calculateEfficiency(route: OptimizedRoute): EfficiencyBreakdown {
  const stopCount = route.stops.length;

  if (stopCount === 0 || route.totalDurationMinutes === 0) {
    return {
      revenuePerHour: 0,
      revenuePerKm: 0,
      stopCount: 0,
      avgMinutesPerStop: 0,
    };
  }

  const totalRevenue = route.stops.reduce(
    (sum, s) => sum + s.customer.sales_value,
    0,
  );
  const totalHours = route.totalDurationMinutes / 60;

  const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
  const revenuePerKm =
    route.totalDistanceKm > 0 ? totalRevenue / route.totalDistanceKm : 0;

  const dwellMinutes = stopCount * DEFAULT_DWELL_MINUTES_PER_STOP;
  const avgMinutesPerStop = (route.totalDurationMinutes + dwellMinutes) / stopCount;

  return {
    revenuePerHour: Math.round(revenuePerHour),
    revenuePerKm: Math.round(revenuePerKm),
    stopCount,
    avgMinutesPerStop: Math.round(avgMinutesPerStop),
  };
}

/**
 * Compare the optimized route against the priority-only baseline to
 * produce both the "travel saved" minutes and the optimization percent.
 */
export function calculateTravelSavings(
  optimized: OptimizedRoute,
  baselineDurationMinutes: number,
): { travelSavedMinutes: number; optimizationPercent: number } {
  if (baselineDurationMinutes <= 0 || optimized.totalDurationMinutes <= 0) {
    return { travelSavedMinutes: 0, optimizationPercent: 0 };
  }
  const saved = Math.max(0, baselineDurationMinutes - optimized.totalDurationMinutes);
  const percent = Math.round((saved / baselineDurationMinutes) * 100);
  return { travelSavedMinutes: Math.round(saved), optimizationPercent: percent };
}
