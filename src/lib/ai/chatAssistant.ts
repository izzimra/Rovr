/**
 * Copilot chat service.
 *
 * Stateless wrapper around the Gemini chat call. History is owned by the
 * Zustand `ai-store`; this service only consumes it. Per Requirement 9.4,
 * conversation history is session-only and never persisted.
 *
 * The service always returns a usable `ChatResponse`. When Gemini is
 * unavailable, a grounded deterministic reply takes over, voiced like
 * the rest of the copilot so the rep cannot tell the difference.
 */

import type { ChatMessage, ChatResponse, CopilotContext } from "../../types/ai";
import { chatWithGemini } from "../gemini/services";
import {
  CallTrace,
  classifyError,
  generateId,
  hasGeminiApiKey,
} from "../gemini/helpers";
import { formatDuration, formatRinggit } from "./insightFormatter";
import { describeClusters } from "./context";

export interface CopilotResult {
  response: ChatResponse;
  trace: CallTrace;
}

export async function chatWithCopilotWithTrace(
  userMessage: string,
  context: CopilotContext,
): Promise<CopilotResult> {
  const trace = new CallTrace();
  const trimmed = userMessage.trim();

  if (trimmed.length === 0) {
    trace.markFallback("insufficient_context");
    return {
      response: {
        message: assistantMessage(
          "Ask me about an account, today's route, or a KPI — I'll ground the answer in your current session data.",
        ),
        suggestions: [
          "Who should I visit first?",
          "Summarise today's revenue opportunity.",
          "Which accounts are going stale?",
        ],
      },
      trace,
    };
  }

  if (context.customers.length === 0) {
    trace.markFallback("insufficient_context");
    return {
      response: {
        message: assistantMessage(
          "No accounts are loaded for the current session yet. Upload a CSV or activate Demo Mode and I'll start reasoning over your territory.",
        ),
        suggestions: ["Activate Demo Mode", "What should a CSV contain?"],
      },
      trace,
    };
  }

  if (!hasGeminiApiKey()) {
    trace.markFallback("no_api_key");
    return {
      response: buildDeterministicReply(trimmed, context),
      trace,
    };
  }

  try {
    const { reply, suggestions } = await chatWithGemini(trimmed, context, trace);
    return {
      response: {
        message: assistantMessage(
          reply.trim() ||
            "I don't have enough grounded context to answer that cleanly. Try asking about a specific customer, the route, or a KPI tile.",
        ),
        suggestions,
      },
      trace,
    };
  } catch (err) {
    trace.markFallback(classifyError(err));
    return {
      response: buildDeterministicReply(trimmed, context),
      trace,
    };
  }
}

export async function chatWithCopilot(
  userMessage: string,
  context: CopilotContext,
): Promise<ChatResponse> {
  const { response } = await chatWithCopilotWithTrace(userMessage, context);
  return response;
}

/** Helper used by the UI to stamp a user message before it hits the API. */
export function buildUserMessage(content: string): ChatMessage {
  return {
    id: generateId("msg"),
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  };
}

function assistantMessage(content: string): ChatMessage {
  return {
    id: generateId("msg"),
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Deterministic copilot reply composer. Looks at the grounded context
 * and returns a useful, numeric answer — never empty, never generic.
 */
function buildDeterministicReply(
  message: string,
  context: CopilotContext,
): ChatResponse {
  const lower = message.toLowerCase();
  const { customers, route, kpis } = context;
  const top = customers[0];
  const stale = customers
    .filter((c) => c.last_visit_days >= 30)
    .sort((a, b) => b.last_visit_days - a.last_visit_days)
    .slice(0, 3);
  const clusters = describeClusters(customers);
  const leadCluster = clusters[0];
  const highTierCount = customers.filter((c) => c.tier === "High").length;

  const suggestionBank = [
    top ? `Why is ${top.customer_name} ranked first?` : undefined,
    stale.length > 0 ? "Which accounts are going stale?" : undefined,
    "Summarise today's route efficiency.",
    "Where is the highest revenue density?",
  ].filter((s): s is string => Boolean(s));

  let reply: string;

  if (/(top|first|visit|start|open)/.test(lower) && top) {
    reply = `Open with ${top.customer_name} — ${top.tier} tier, composite score ${top.score.toFixed(1)}, ${formatRinggit(top.sales_value)} pipeline. Locking this visit in the morning consolidates the ${leadCluster?.name ?? "lead"} cluster before westbound travel.`;
  } else if (/(stale|overdue|old|ignored|neglect)/.test(lower)) {
    reply = stale.length
      ? `${stale.length} account${stale.length === 1 ? "" : "s"} past the 30-day freshness window: ${stale.map((s) => `${s.customer_name} (${s.last_visit_days}d)`).join(", ")}. Sequence at least one this week to neutralise renewal risk.`
      : `No accounts exceed the 30-day freshness window. Current territory cadence is within control.`;
  } else if (/(revenue|pipeline|money|rm|value)/.test(lower)) {
    const pipelineValue = customers.reduce((sum, c) => sum + c.sales_value, 0);
    reply = kpis
      ? `Projected revenue today: ${formatRinggit(kpis.estimatedRevenue)} at ${kpis.optimizationPercent}% optimisation. ${highTierCount} High-tier accounts concentrate the bulk of the ${formatRinggit(pipelineValue)} total pipeline.`
      : `Addressable pipeline across the current session: ${formatRinggit(pipelineValue)} from ${customers.length} accounts, ${highTierCount} of them High tier.`;
  } else if (/(route|travel|drive|distance|time|sequence|leg)/.test(lower)) {
    reply = route
      ? `Route runs ${route.stops.length} stops across ${route.totalDistanceKm.toFixed(1)} km in ${formatDuration(route.totalDurationMinutes)}. High-tier accounts occupy the first half of the sequence, protecting quota even if the afternoon slips.`
      : `No optimised route in the current session yet. Trigger optimisation to see per-leg travel estimates and cluster-level revenue density.`;
  } else if (/(kpi|metric|efficiency|saving|score)/.test(lower) && kpis) {
    reply = `Route efficiency: ${formatRinggit(kpis.routeEfficiency)} per hour. Travel saved vs priority-only ordering: ${kpis.travelSavedMinutes} min. Opportunity score: ${kpis.opportunityScore}/100.`;
  } else if (/(cluster|territory|area|zone|region)/.test(lower) && leadCluster) {
    reply = `${leadCluster.name} leads the territory with ${leadCluster.count} accounts representing ${formatRinggit(leadCluster.totalValue)} of pipeline. Sequence it as the morning block before committing to distant legs.`;
  } else {
    reply = top
      ? `Grounded snapshot: ${customers.length} accounts, ${highTierCount} High tier, ${formatRinggit(customers.reduce((s, c) => s + c.sales_value, 0))} pipeline. Today's anchor is ${top.customer_name} (${top.tier}, ${formatRinggit(top.sales_value)}).`
      : `Grounded snapshot: ${customers.length} accounts currently in session. Ask about stale accounts, cluster density, or the route to go deeper.`;
  }

  return {
    message: assistantMessage(reply),
    suggestions: suggestionBank.slice(0, 3),
  };
}
