/**
 * POST /api/chat
 *
 * Single-turn copilot endpoint. The client owns conversation history
 * (per Requirement 9.4, chat history is session-only) and sends the
 * full context up each turn.
 *
 * Request body:
 *   {
 *     message: string,
 *     context: {
 *       customers: RankedCustomer[],
 *       route?: OptimizedRoute,
 *       kpis?: KPIData,
 *       history: ChatMessage[]
 *     }
 *   }
 *
 * Response:
 *   AIResponseEnvelope<ChatResponse>
 */

import { NextRequest } from "next/server";
import { chatWithCopilotWithTrace } from "../../../lib/ai/chatAssistant";
import type { ChatMessage, CopilotContext } from "../../../types/ai";
import { errorJson, okJson } from "../_lib/envelope";

export const runtime = "nodejs";

interface ChatRequest {
  message: string;
  context: CopilotContext;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return errorJson("Invalid JSON body.", 400, "bad_request");
  }

  if (typeof body?.message !== "string") {
    return errorJson(
      "Request must include a `message` string.",
      400,
      "bad_request",
    );
  }

  const context: CopilotContext = {
    customers: Array.isArray(body.context?.customers)
      ? body.context.customers
      : [],
    route: body.context?.route,
    kpis: body.context?.kpis,
    history: Array.isArray(body.context?.history)
      ? (body.context.history as ChatMessage[])
      : [],
  };

  const { response, trace } = await chatWithCopilotWithTrace(
    body.message,
    context,
  );

  return okJson(response, { startTime, trace, service: "copilot" });
}
