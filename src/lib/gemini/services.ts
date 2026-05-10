/**
 * Low-level Gemini service functions.
 *
 * Each function takes typed input, invokes Gemini with the matching prompt
 * from `./prompts.ts`, enforces a native response schema, and returns a
 * typed response. These are the primitives that the higher-level
 * `lib/ai/*` services compose.
 *
 * Intentionally free of business logic so the same primitives can be
 * reused from API routes, server actions, and background jobs.
 */

import {
  NARRATIVE_GENERATION_CONFIG,
  STRUCTURED_GENERATION_CONFIG,
} from "./config";
import { generateJson } from "./client";
import {
  ROVR_SYSTEM_INSTRUCTION,
  buildCopilotPrompt,
  buildCustomerReasoningPrompt,
  buildDailyBriefPrompt,
  buildInsightsPrompt,
  buildPrioritizationPrompt,
  buildRouteReasoningPrompt,
} from "./prompts";
import {
  COPILOT_SCHEMA,
  CUSTOMER_REASONING_SCHEMA,
  DAILY_BRIEF_SCHEMA,
  INSIGHTS_SCHEMA,
  PRIORITIZATION_SCHEMA,
  ROUTE_REASONING_SCHEMA,
} from "./schemas";
import type {
  CustomerSummary,
  RankedCustomer,
} from "../../types/customer";
import type { OptimizedRoute, RouteInsight } from "../../types/route";
import type { KPIData } from "../../types/analytics";
import type {
  AIInsight,
  ChatMessage,
  DailyBrief,
  PrioritizationResult,
} from "../../types/ai";
import { CallTrace, clamp, generateId } from "./helpers";
import { GEMINI_MODEL } from "./config";

// --- Prioritization -----------------------------------------------------

interface RawPrioritization {
  rankings: Array<{
    customer_name: string;
    score: number;
    rank: number;
    explanation: string;
  }>;
}

export async function rankCustomersWithGemini(
  customers: CustomerSummary[],
  trace?: CallTrace,
): Promise<PrioritizationResult> {
  const prompt = buildPrioritizationPrompt(customers);
  const raw = await generateJson<RawPrioritization>(prompt, {
    systemInstruction: ROVR_SYSTEM_INSTRUCTION,
    generationConfig: STRUCTURED_GENERATION_CONFIG,
    responseSchema: PRIORITIZATION_SCHEMA,
    trace,
  });

  const rankings = (raw.rankings ?? []).map((r) => ({
    customer_name: r.customer_name,
    score: clamp(Number(r.score) || 0, 0, 100),
    rank: Math.max(1, Math.floor(Number(r.rank) || 1)),
    explanation: (r.explanation ?? "").slice(0, 200),
  }));

  return {
    rankings,
    generatedAt: new Date().toISOString(),
    model: GEMINI_MODEL,
  };
}

// --- Daily brief --------------------------------------------------------

export async function generateDailyBriefWithGemini(
  customers: RankedCustomer[],
  route: OptimizedRoute | undefined,
  kpis: KPIData | undefined,
  trace?: CallTrace,
): Promise<DailyBrief> {
  const prompt = buildDailyBriefPrompt(customers, route, kpis);
  const raw = await generateJson<Omit<DailyBrief, "generatedAt">>(prompt, {
    systemInstruction: ROVR_SYSTEM_INSTRUCTION,
    generationConfig: NARRATIVE_GENERATION_CONFIG,
    responseSchema: DAILY_BRIEF_SCHEMA,
    trace,
  });
  return {
    headline: raw.headline ?? "",
    summary: raw.summary ?? "",
    talkingPoints: Array.isArray(raw.talkingPoints)
      ? raw.talkingPoints.slice(0, 5)
      : [],
    topCustomer: raw.topCustomer ?? customers[0]?.customer_name ?? "",
    generatedAt: new Date().toISOString(),
  };
}

// --- Route reasoning ----------------------------------------------------

export async function generateRouteReasoningWithGemini(
  route: OptimizedRoute,
  trace?: CallTrace,
): Promise<RouteInsight> {
  const prompt = buildRouteReasoningPrompt(route);
  const raw = await generateJson<RouteInsight>(prompt, {
    systemInstruction: ROVR_SYSTEM_INSTRUCTION,
    generationConfig: NARRATIVE_GENERATION_CONFIG,
    responseSchema: ROUTE_REASONING_SCHEMA,
    trace,
  });
  return {
    headline: raw.headline ?? "",
    reasoning: raw.reasoning ?? "",
    highlights: Array.isArray(raw.highlights) ? raw.highlights.slice(0, 5) : [],
  };
}

// --- Customer-level explanation ----------------------------------------

export async function explainCustomerWithGemini(
  customer: RankedCustomer,
  trace?: CallTrace,
): Promise<string> {
  const prompt = buildCustomerReasoningPrompt(customer);
  const raw = await generateJson<{ explanation: string }>(prompt, {
    systemInstruction: ROVR_SYSTEM_INSTRUCTION,
    generationConfig: STRUCTURED_GENERATION_CONFIG,
    responseSchema: CUSTOMER_REASONING_SCHEMA,
    trace,
  });
  return (raw.explanation ?? "").slice(0, 200);
}

// --- Insights -----------------------------------------------------------

interface RawInsights {
  insights: Array<{
    category: AIInsight["category"];
    title: string;
    body: string;
    severity: AIInsight["severity"];
    relatedCustomer: string | null;
    cta: string | null;
  }>;
}

export async function generateInsightsWithGemini(
  customers: RankedCustomer[],
  route: OptimizedRoute | undefined,
  kpis: KPIData | undefined,
  trace?: CallTrace,
): Promise<AIInsight[]> {
  const prompt = buildInsightsPrompt(customers, route, kpis);
  const raw = await generateJson<RawInsights>(prompt, {
    systemInstruction: ROVR_SYSTEM_INSTRUCTION,
    generationConfig: NARRATIVE_GENERATION_CONFIG,
    responseSchema: INSIGHTS_SCHEMA,
    trace,
  });

  return (raw.insights ?? []).slice(0, 6).map((i) => ({
    id: generateId("insight"),
    category: i.category,
    title: i.title,
    body: i.body,
    severity: i.severity,
    relatedCustomer: i.relatedCustomer ?? undefined,
    cta: i.cta ?? undefined,
  }));
}

// --- Copilot ------------------------------------------------------------

interface RawCopilotReply {
  reply: string;
  suggestions: string[];
}

export async function chatWithGemini(
  userMessage: string,
  context: {
    customers: RankedCustomer[];
    route?: OptimizedRoute;
    kpis?: KPIData;
    history: ChatMessage[];
  },
  trace?: CallTrace,
): Promise<RawCopilotReply> {
  const prompt = buildCopilotPrompt(userMessage, context);
  const raw = await generateJson<RawCopilotReply>(prompt, {
    systemInstruction: ROVR_SYSTEM_INSTRUCTION,
    generationConfig: NARRATIVE_GENERATION_CONFIG,
    responseSchema: COPILOT_SCHEMA,
    trace,
  });
  return {
    reply: raw.reply ?? "",
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.slice(0, 3)
      : [],
  };
}
