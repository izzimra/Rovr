/**
 * AI surface types.
 *
 * Contracts shared between the Gemini client, prompt layer, AI services,
 * Zustand stores, and `/api/*` route handlers. Response shapes are the
 * authoritative schema the AI services must normalize Gemini output into.
 */

import type { RankedCustomer } from "./customer";
import type { OptimizedRoute } from "./route";
import type { KPIData } from "./analytics";

/** Severity/tone tag for AI insights in the dashboard. */
export type InsightSeverity = "info" | "positive" | "warning" | "critical";

/** Insight surface category, used to route cards to the right panel. */
export type InsightCategory =
  | "daily_brief"
  | "route_reasoning"
  | "opportunity"
  | "strategy"
  | "risk";

export interface AIInsight {
  id: string;
  category: InsightCategory;
  title: string;
  body: string;
  severity: InsightSeverity;
  /** Optional customer the insight is anchored to, by customer_name. */
  relatedCustomer?: string;
  /** Optional CTA label the UI can surface, e.g. "Reprioritize". */
  cta?: string;
}

export interface DailyBrief {
  headline: string;
  summary: string;
  /** 3–5 bullet talking points for the rep's morning review. */
  talkingPoints: string[];
  /** Name of the single top-priority customer for the day. */
  topCustomer: string;
  generatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  message: ChatMessage;
  /** Optional structured suggestions to render as quick-reply chips. */
  suggestions?: string[];
}

/** Full structured context passed to the copilot for grounded responses. */
export interface CopilotContext {
  customers: RankedCustomer[];
  route?: OptimizedRoute;
  kpis?: KPIData;
  history: ChatMessage[];
}

/** Structured response shape returned by the prioritization Gemini call. */
export interface PrioritizationResult {
  rankings: Array<{
    customer_name: string;
    score: number;
    rank: number;
    explanation: string;
  }>;
  generatedAt: string;
  /** Echoes which model produced the output for observability. */
  model: string;
}

/** Wrapper around any AI-generated payload for API responses. */
export interface AIResponseEnvelope<T> {
  data: T;
  meta: {
    model: string;
    latencyMs: number;
    /** True when the payload is a deterministic fallback, not Gemini output. */
    fallback: boolean;
    generatedAt: string;
  };
}
