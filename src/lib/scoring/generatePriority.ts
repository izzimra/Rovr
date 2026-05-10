/**
 * Priority label helpers.
 *
 * Thin wrappers over tier mapping so UI components and AI services can
 * share a consistent label/accent palette without hardcoding strings.
 */

import type { PriorityTier } from "../../types/customer";
import { tierFor } from "./calculateScore";

export interface PriorityDescriptor {
  tier: PriorityTier;
  label: string;
  /** Semantic accent name the UI maps to a color token. */
  accent: "positive" | "neutral" | "muted";
  /** Short sentence the UI can surface in a tooltip or badge. */
  description: string;
}

export function generatePriority(priorityValue: number): PriorityDescriptor {
  const tier = tierFor(priorityValue);
  switch (tier) {
    case "High":
      return {
        tier,
        label: "High priority",
        accent: "positive",
        description: "Visit today. Revenue impact and urgency are both strong.",
      };
    case "Medium":
      return {
        tier,
        label: "Medium priority",
        accent: "neutral",
        description: "Schedule this week. Meaningful pipeline with moderate urgency.",
      };
    case "Low":
    default:
      return {
        tier,
        label: "Low priority",
        accent: "muted",
        description: "Backlog. Revisit once higher-tier accounts are cleared.",
      };
  }
}
