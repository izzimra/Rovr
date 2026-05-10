/**
 * Formatting helpers shared by AI services.
 *
 * Converts between Gemini output shapes, internal domain types, and the
 * presentation strings the dashboard renders. Kept separate so prompt
 * drift or API surface changes only require edits in one place.
 */

import type { RankedCustomer, CustomerSummary } from "../../types/customer";
import type { AIInsight } from "../../types/ai";
import { generateId } from "../gemini/helpers";

/** Project a full RankedCustomer to the compact shape sent to Gemini. */
export function toCustomerSummary(c: RankedCustomer): CustomerSummary {
  return {
    customer_name: c.customer_name,
    sales_value: c.sales_value,
    priority: c.priority,
    potential_score: c.potential_score,
    last_visit_days: c.last_visit_days,
    tier: c.tier,
  };
}

/** Format RM currency without pulling in a heavy i18n dependency. */
export function formatRinggit(value: number): string {
  if (!Number.isFinite(value)) return "RM0";
  return `RM${Math.round(value).toLocaleString("en-MY")}`;
}

/**
 * Convert a minutes-count into a short human label, e.g. "1h 20m".
 * The insights panel and KPI tooltips both use this shape.
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Build a deterministic fallback insight when Gemini fails. The insights
 * panel always renders something so the dashboard never shows a blank slot.
 */
export function buildFallbackInsight(
  category: AIInsight["category"],
  title: string,
  body: string,
  severity: AIInsight["severity"] = "info",
): AIInsight {
  return {
    id: generateId("insight"),
    category,
    title,
    body,
    severity,
  };
}
