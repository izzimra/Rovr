/**
 * Shared API response envelope.
 *
 * Every `/api/*` route wraps its payload so the frontend can rely on a
 * single shape for success, error, and observability metadata.
 */

import { NextResponse } from "next/server";
import type { AIResponseEnvelope } from "../../../types/ai";
import { GEMINI_MODEL } from "../../../lib/gemini/config";

export interface EnvelopeOptions {
  startTime: number;
  fallback?: boolean;
  model?: string;
}

export function okJson<T>(data: T, opts: EnvelopeOptions): NextResponse {
  const envelope: AIResponseEnvelope<T> = {
    data,
    meta: {
      model: opts.model ?? GEMINI_MODEL,
      latencyMs: Date.now() - opts.startTime,
      fallback: opts.fallback ?? false,
      generatedAt: new Date().toISOString(),
    },
  };
  return NextResponse.json(envelope);
}

export function errorJson(
  message: string,
  status = 500,
  code = "ai_error",
): NextResponse {
  return NextResponse.json(
    {
      error: { code, message },
    },
    { status },
  );
}
