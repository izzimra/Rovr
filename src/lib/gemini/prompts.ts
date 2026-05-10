/**
 * Prompt library.
 *
 * All Gemini prompts live here so prompt engineering is centralized,
 * versionable, and reviewable in code review. Each prompt is a pure
 * function of its context and returns a ready-to-send string.
 *
 * Voice and tone guardrails applied across every prompt:
 *  - Strategic, executive-level, enterprise-grade.
 *  - Concise. No filler. No hype. Plain English.
 *  - Concrete: reference specific customer names and numbers when possible.
 *  - Analytical, not salesy. The rep is a peer, not a lead.
 */

import type { CustomerSummary, RankedCustomer } from "../../types/customer";
import type { OptimizedRoute } from "../../types/route";
import type { KPIData } from "../../types/analytics";
import type { ChatMessage } from "../../types/ai";

/** Shared system instruction used across all AI calls. */
export const ROVR_SYSTEM_INSTRUCTION = `You are Rovr, an AI copilot for elite B2B field sales teams.
Voice: strategic, concise, executive-grade. Never use marketing fluff.
Discipline: ground every answer in the structured data provided. If the data is insufficient, say so plainly.
Format: prefer short paragraphs and tight bullet lists. Never invent customers, revenue, or routes.`;

function summarizeCustomers(customers: RankedCustomer[] | CustomerSummary[]): string {
  return customers
    .slice(0, 50)
    .map((c, i) => {
      const tier = "tier" in c ? c.tier : "Medium";
      const score = "score" in c && typeof c.score === "number" ? c.score : undefined;
      const scoreFragment =
        score !== undefined ? `, score=${score.toFixed(2)}` : "";
      return `${i + 1}. ${c.customer_name} | tier=${tier}, priority=${c.priority}, sales_value=${c.sales_value}, potential=${c.potential_score}, last_visit=${c.last_visit_days}d${scoreFragment}`;
    })
    .join("\n");
}

function summarizeRoute(route: OptimizedRoute | undefined): string {
  if (!route || route.stops.length === 0) return "No optimized route is available.";
  const stops = route.stops
    .map(
      (s) =>
        `${s.order}. ${s.customer.customer_name} [${s.customer.tier}] (+${s.legDurationMinutes}min, ${s.legDistanceKm.toFixed(1)}km)`,
    )
    .join("\n");
  return `Origin: ${route.originLabel}
Total duration: ${route.totalDurationMinutes} min
Total distance: ${route.totalDistanceKm.toFixed(1)} km
Stops:
${stops}`;
}

function summarizeKpis(kpis: KPIData | undefined): string {
  if (!kpis) return "KPIs have not been computed yet.";
  return [
    `Estimated revenue: RM${kpis.estimatedRevenue.toLocaleString()}`,
    `Route efficiency: RM${kpis.routeEfficiency.toFixed(0)} / hr`,
    `Travel saved: ${kpis.travelSavedMinutes} min`,
    `Priority customers: ${kpis.priorityCustomers}`,
    `Opportunity score: ${kpis.opportunityScore}/100`,
    `Optimization: ${kpis.optimizationPercent}%`,
  ].join("\n");
}

// --- Prompt builders ----------------------------------------------------

/** Customer prioritization prompt. Produces a strict ranked JSON array. */
export function buildPrioritizationPrompt(customers: CustomerSummary[]): string {
  return `You are ranking a field sales rep's customers for today's route.

CUSTOMER DATA:
${summarizeCustomers(customers)}

RANKING RULES:
- Weight sales_value (40%), priority (30%), potential_score (20%), and recency of last_visit_days (10%).
- Reward High tier customers with overdue visits. Penalize stale Low-tier leads.
- Every explanation must cite at least one concrete number from the data.

RESPONSE SCHEMA (strict JSON):
{
  "rankings": [
    {
      "customer_name": string,
      "score": number,       // 0-100
      "rank": number,        // 1-indexed, unique across all customers
      "explanation": string  // <= 140 chars, executive tone, cites numbers
    }
  ]
}`;
}

/** Daily briefing prompt. Produces a narrative JSON payload. */
export function buildDailyBriefPrompt(
  customers: RankedCustomer[],
  route: OptimizedRoute | undefined,
  kpis: KPIData | undefined,
): string {
  return `Generate today's executive sales brief for a field rep in Malaysia.

TOP-RANKED CUSTOMERS:
${summarizeCustomers(customers.slice(0, 10))}

OPTIMIZED ROUTE:
${summarizeRoute(route)}

KPIs:
${summarizeKpis(kpis)}

INSTRUCTIONS:
- Headline: 1 sentence, boardroom-ready, no emojis.
- Summary: 2-3 sentences framing the day's revenue opportunity and key risk.
- Talking points: 3-5 specific, numeric, action-oriented bullets.
- Top customer: the single customer with the highest expected ROI today.

RESPONSE SCHEMA (strict JSON):
{
  "headline": string,
  "summary": string,
  "talkingPoints": string[],
  "topCustomer": string
}`;
}

/** Route reasoning prompt. Short, confident, cites travel + value. */
export function buildRouteReasoningPrompt(route: OptimizedRoute): string {
  return `Explain why the following visit order is optimal for a field sales rep.

ROUTE:
${summarizeRoute(route)}

INSTRUCTIONS:
- Headline: one clean sentence.
- Reasoning: 2-3 sentences covering revenue density, travel efficiency, and priority coverage.
- Highlights: 3 concrete bullet points comparing stops (e.g. "Stop 1 delivers 32% more revenue than Stop 2 at half the travel time").

RESPONSE SCHEMA (strict JSON):
{
  "headline": string,
  "reasoning": string,
  "highlights": string[]
}`;
}

/** Customer-level reasoning prompt. Used to hydrate the ranked list. */
export function buildCustomerReasoningPrompt(customer: RankedCustomer): string {
  return `Write a single-sentence executive justification for prioritising the following customer today.

CUSTOMER:
name=${customer.customer_name}
tier=${customer.tier}
priority=${customer.priority}
sales_value=${customer.sales_value}
potential_score=${customer.potential_score}
last_visit_days=${customer.last_visit_days}
rank=${customer.rank}
score=${customer.score.toFixed(2)}

CONSTRAINTS:
- Max 140 characters.
- Cite at least one concrete number.
- No emojis. No exclamation marks. No sales fluff.

RESPONSE SCHEMA (strict JSON):
{ "explanation": string }`;
}

/** Opportunity insights prompt. Produces an array of AIInsight-shaped objects. */
export function buildInsightsPrompt(
  customers: RankedCustomer[],
  route: OptimizedRoute | undefined,
  kpis: KPIData | undefined,
): string {
  return `Produce strategic business insights for today's sales plan.

TOP CUSTOMERS:
${summarizeCustomers(customers.slice(0, 12))}

ROUTE:
${summarizeRoute(route)}

KPIs:
${summarizeKpis(kpis)}

INSTRUCTIONS:
- Produce exactly 4 insights spanning: 1 "opportunity", 1 "risk", 1 "strategy", 1 "route_reasoning".
- Each title <= 60 chars. Each body <= 280 chars. No emojis.
- Reference customer names and numbers wherever relevant.

RESPONSE SCHEMA (strict JSON):
{
  "insights": [
    {
      "category": "opportunity" | "risk" | "strategy" | "route_reasoning",
      "title": string,
      "body": string,
      "severity": "info" | "positive" | "warning" | "critical",
      "relatedCustomer": string | null,
      "cta": string | null
    }
  ]
}`;
}

/** Copilot chat prompt. Grounded on current customer + route + KPI state. */
export function buildCopilotPrompt(
  userMessage: string,
  context: {
    customers: RankedCustomer[];
    route?: OptimizedRoute;
    kpis?: KPIData;
    history: ChatMessage[];
  },
): string {
  const history = context.history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return `You are Rovr's sales copilot. Answer the rep's question using only the grounded data.

GROUNDED CONTEXT
Customers (top 20):
${summarizeCustomers(context.customers.slice(0, 20))}

Route:
${summarizeRoute(context.route)}

KPIs:
${summarizeKpis(context.kpis)}

RECENT CONVERSATION:
${history || "(no prior messages)"}

USER MESSAGE:
${userMessage}

INSTRUCTIONS:
- Answer in <= 120 words.
- Ground every numeric claim in the data above.
- If data is missing, say "I don't have that yet" and suggest the next action.
- Offer up to 3 follow-up suggestions the rep can tap next.

RESPONSE SCHEMA (strict JSON):
{
  "reply": string,
  "suggestions": string[]
}`;
}
