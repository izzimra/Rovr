/**
 * Customer domain types.
 *
 * Mirrors the Customer_Record contract defined in the Rovr requirements spec.
 * CSV columns map 1:1 to `Customer` fields; `id` and `userId` are added
 * by the backend when rows are persisted to the Data_Store.
 */

/** Coarse-grained priority tier derived from `priority` thresholds. */
export type PriorityTier = "High" | "Medium" | "Low";

/** Raw customer record as it lands from CSV import or mock seed. */
export interface Customer {
  /** Supabase-assigned primary key. Optional for in-memory/mock records. */
  id?: string;
  /** Supabase-assigned owner id. Optional for in-memory/mock records. */
  userId?: string;
  customer_name: string;
  latitude: number;
  longitude: number;
  sales_value: number;
  /** Numeric 0–10 signal from the rep's CRM. */
  priority: number;
  last_visit_days: number;
  /** Numeric 0–100 propensity/opportunity score. */
  potential_score: number;
}

/** Customer augmented with the output of the scoring engine. */
export interface RankedCustomer extends Customer {
  /** Composite score from `calculateScore`. */
  score: number;
  /** 1-indexed rank across the current user's customer set. */
  rank: number;
  tier: PriorityTier;
  /**
   * Human-readable justification. May be a deterministic fallback string
   * until the Gemini reasoning pass fills it in.
   */
  explanation: string;
}

/** Minimal summary used when passing customer context to Gemini. */
export interface CustomerSummary {
  customer_name: string;
  sales_value: number;
  priority: number;
  potential_score: number;
  last_visit_days: number;
  tier: PriorityTier;
}
