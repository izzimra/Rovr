/**
 * Mock insights used as a deterministic fallback for first-load rendering
 * and Demo_Mode, before Gemini has a chance to produce live insights.
 */

import type { AIInsight, DailyBrief } from "../../types/ai";
import type { RouteInsight } from "../../types/route";
import { generateId } from "../gemini/helpers";

export const MOCK_DAILY_BRIEF: DailyBrief = {
  headline: "Damansara Heights Holdings leads today's pipeline.",
  summary:
    "High-tier accounts concentrate in KLCC and Damansara. Shah Alam manufacturing brings volume. Focus the morning on revenue density, then swing west.",
  talkingPoints: [
    "RM 1.85M pipeline across 18 accounts, 8 High tier.",
    "Damansara Heights + KLCC cluster delivers 42% of expected revenue.",
    "Three Bangi / Subang accounts are overdue (>35 days).",
    "Morning route is 23% more efficient than the naive priority order.",
  ],
  topCustomer: "Damansara Heights Holdings",
  generatedAt: new Date(0).toISOString(),
};

export const MOCK_ROUTE_INSIGHT: RouteInsight = {
  headline: "Route front-loads Damansara and KLCC for maximum revenue density.",
  reasoning:
    "The sequence clusters High-tier Klang Valley accounts before the longer westbound leg to Shah Alam, trading 18 extra kilometers for RM 420k of additional pipeline exposure.",
  highlights: [
    "Stop 1 delivers 2.3x the revenue of the median stop.",
    "Westbound leg saves 34 minutes vs priority-only ordering.",
    "High-tier customers occupy stops 1-4 of the route.",
  ],
};

export const MOCK_INSIGHTS: AIInsight[] = [
  {
    id: generateId("insight"),
    category: "opportunity",
    title: "Damansara Heights is a 95-potential warm lead",
    body:
      "Last visited 3 days ago with RM 205k on the table. High close probability if you open with the renewal terms discussed last quarter.",
    severity: "positive",
    relatedCustomer: "Damansara Heights Holdings",
  },
  {
    id: generateId("insight"),
    category: "risk",
    title: "Three Klang Valley accounts going stale",
    body:
      "Puchong Industrial Link (72d), Kajang Business Park (55d), and i-City Logistics (40d) are past the 30-day freshness window. Schedule touches this week.",
    severity: "warning",
  },
  {
    id: generateId("insight"),
    category: "strategy",
    title: "Focus the first 3 hours on KLCC cluster",
    body:
      "Petronas Twin Towers, KLCC Fintech, and Mid Valley collectively represent RM 483k of same-day revenue within a 4km radius.",
    severity: "info",
  },
  {
    id: generateId("insight"),
    category: "route_reasoning",
    title: "Westbound leg is worth the travel time",
    body:
      "Adding Shah Alam Manufacturing (RM 167k) extends the day by 28 minutes but lifts expected revenue by 24%. Net efficiency improves.",
    severity: "positive",
    relatedCustomer: "Shah Alam Manufacturing Co",
  },
];
