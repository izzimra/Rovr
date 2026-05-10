/**
 * Copilot chat service.
 *
 * Stateless wrapper around the Gemini chat call. History is owned by the
 * Zustand `ai-store` — this service only consumes it. Per the spec,
 * conversation history is session-only and never persisted.
 */

import type { ChatMessage, ChatResponse, CopilotContext } from "../../types/ai";
import { chatWithGemini } from "../gemini/services";
import { generateId } from "../gemini/helpers";

export async function chatWithCopilot(
  userMessage: string,
  context: CopilotContext,
): Promise<ChatResponse> {
  const trimmed = userMessage.trim();
  if (trimmed.length === 0) {
    return {
      message: assistantMessage(
        "I didn't catch that. Ask me about a customer, the route, or today's KPIs.",
      ),
      suggestions: [
        "Who should I visit first?",
        "Summarize today's revenue opportunity.",
        "Which accounts are going stale?",
      ],
    };
  }

  if (context.customers.length === 0) {
    return {
      message: assistantMessage(
        "I don't have any customer data yet. Upload a CSV or enable Demo Mode and I'll take it from there.",
      ),
      suggestions: ["Enable Demo Mode", "How do I upload a CSV?"],
    };
  }

  try {
    const { reply, suggestions } = await chatWithGemini(trimmed, context);
    return {
      message: assistantMessage(
        reply.trim() || "I couldn't generate a response. Try rephrasing your question.",
      ),
      suggestions,
    };
  } catch {
    return {
      message: assistantMessage(
        "The copilot is temporarily unavailable. Your plan, rankings, and KPIs are still live on the dashboard.",
      ),
      suggestions: [
        "Show me today's top customers",
        "What's the route total distance?",
      ],
    };
  }
}

function assistantMessage(content: string): ChatMessage {
  return {
    id: generateId("msg"),
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
  };
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
