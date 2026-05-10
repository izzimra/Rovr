/**
 * Shared API response envelope.
 *
 * Every `/api/*` route wraps its payload so the frontend can rely on a
 * single shape for success, error, and observability metadata.
 *
 * When a `CallTrace` is supplied, its attempt/retry/fallback counters
 * are threaded into the envelope so the frontend can surface subtle
 * degraded-mode indicators without touching the data contract.
 */

import { NextResponse } from "next/server";
import type {
  AIResponseEnvelope,
  AIResponseMeta,
  AIServiceName,
  FallbackReason,
} from "../../../types/ai";
import { GEMINI_MODEL } from "../../../lib/gemini/config";
import type { CallTrace } from "../../../lib/gemini/helpers";

export interface EnvelopeOptions {
  startTime: number;
  fallback?: boolean;
  fallbackReason?: FallbackReason;
  model?: string;
  trace?: CallTrace;
  service?: AIServiceName;
}

export function okJson<T>(data: T, opts: EnvelopeOptions): NextResponse {
  const trace = opts.trace;
  const fallback = opts.fallback ?? trace?.fallback ?? false;
  const fallbackReason = opts.fallbackReason ?? trace?.fallbackReason;

  const meta: AIResponseMeta = {
    model: opts.model ?? GEMINI_MODEL,
    latencyMs: Date.now() - opts.startTime,
    fallback,
    generatedAt: new Date().toISOString(),
  };
  if (fallbackReason) meta.fallbackReason = fallbackReason;
  if (trace) {
    meta.attempts = trace.attempts;
    meta.retries = trace.retries();
  }
  if (opts.service) meta.service = opts.service;

  const envelope: AIResponseEnvelope<T> = { data, meta };
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
