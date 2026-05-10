/**
 * Analytics and KPI types powering the KPI_Dashboard and Analytics_View.
 *
 * All values are scoped to the current session per the requirements spec;
 * historical trends are intentionally out of scope for the MVP.
 */

export interface KPIData {
  /** Sum of `sales_value` across the current optimized route. */
  estimatedRevenue: number;
  /** Revenue per hour of total route duration. */
  routeEfficiency: number;
  /** Minutes saved vs. the priority-only (unoptimized) sequence. */
  travelSavedMinutes: number;
  /** Count of High-tier customers included in the optimized route. */
  priorityCustomers: number;
  /**
   * 0–100 composite score summarising how strong today's plan is.
   * Mostly used for the "Opportunity Score" tile in the insights panel.
   */
  opportunityScore: number;
  /** 0–100 ratio of optimized vs. naive route performance. */
  optimizationPercent: number;
}

export interface RevenueProjection {
  /** Dollar value expected from the current session's top-N stops. */
  expectedRevenue: number;
  /** Best-case revenue if every stop closes. */
  upsideRevenue: number;
  /** Conservative revenue if only High-tier stops close. */
  floorRevenue: number;
  /** Close-rate assumption used for the projection, 0–1. */
  assumedCloseRate: number;
}

export interface EfficiencyBreakdown {
  /** Revenue per hour across the whole route. */
  revenuePerHour: number;
  /** Revenue per kilometer travelled. */
  revenuePerKm: number;
  /** Count of stops in the optimized route. */
  stopCount: number;
  /** Average dwell + travel time per stop, in minutes. */
  avgMinutesPerStop: number;
}
