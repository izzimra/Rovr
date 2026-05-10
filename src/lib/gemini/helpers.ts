/**
 * Gemini helper utilities.
 *
 * Small, pure utilities used by the client and services:
 *  - structured-output parsing (tolerates ```json fences and prose wrappers)
 *  - exponential backoff for retry-safe calls
 *  - a shared error type for consistent failure surfaces
 *  - a lightweight CallTrace used to thread observability metadata
 *    through services and into the API envelope
 */

import { RETRY_CONFIG } from "./config";
import type { FallbackReason } from "../../types/ai";

/** Error surfaced by Gemini calls once the retry budget is exhausted. */
export class GeminiError extends Error {
  override readonly cause: unknown;
  readonly attempts: number;
  readonly reason: FallbackReason;

  constructor(
    message: string,
    opts: { cause?: unknown; attempts?: number; reason?: FallbackReason } = {},
  ) {
    super(message);
    this.name = "GeminiError";
    this.cause = opts.cause;
    this.attempts = opts.attempts ?? 1;
    this.reason = opts.reason ?? "gemini_error";
  }
}

/**
 * Classify an unknown error into a stable FallbackReason so the envelope
 * always carries a meaningful code. Network timeouts, auth failures, and
 * rate limits each land on their own reason for observability.
 */
export function classifyError(err: unknown): FallbackReason {
  if (err instanceof GeminiError) return err.reason;
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const lower = message.toLowerCase();
  if (lower.includes("timed out")) return "gemini_timeout";
  if (lower.includes("api key") || lower.includes("gemini_api_key"))
    return "no_api_key";
  if (lower.includes("429") || lower.includes("rate limit"))
    return "rate_limited";
  if (lower.includes("empty")) return "gemini_empty";
  if (lower.includes("schema") || lower.includes("parse"))
    return "schema_validation_failed";
  return "gemini_error";
}

/**
 * CallTrace tracks attempts, retries, fallback usage, and latency across
 * a single logical operation. Services mutate the same trace instance so
 * the caller can forward it straight into `okJson(...)`.
 */
export class CallTrace {
  readonly startTime: number = Date.now();
  attempts = 0;
  fallback = false;
  fallbackReason: FallbackReason | undefined;

  /** Increment attempt counter; called once per outbound Gemini call. */
  recordAttempt(): void {
    this.attempts += 1;
  }

  /** Mark the trace as a fallback and record why. Idempotent on `reason`. */
  markFallback(reason: FallbackReason): void {
    this.fallback = true;
    if (!this.fallbackReason) this.fallbackReason = reason;
  }

  /** Copy another trace's counters into this one (useful for nested calls). */
  merge(other: CallTrace): void {
    this.attempts = Math.max(this.attempts, other.attempts);
    if (other.fallback) this.markFallback(other.fallbackReason ?? "unknown");
  }

  latencyMs(): number {
    return Date.now() - this.startTime;
  }

  retries(): number {
    return Math.max(0, this.attempts - 1);
  }
}

/**
 * Extract a JSON object/array from a Gemini text response.
 *
 * Gemini will occasionally wrap JSON in ``` fences or add a preamble;
 * this helper trims both and falls through to a raw JSON.parse attempt.
 */
export function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();

  // Strip ```json ... ``` or ``` ... ``` fences if present.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch && fenceMatch[1]) {
    return JSON.parse(fenceMatch[1]) as T;
  }

  // Fall back to the first balanced JSON object or array in the text.
  const firstBrace = trimmed.search(/[\[{]/);
  if (firstBrace > 0) {
    const candidate = trimmed.slice(firstBrace);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // fall through
    }
  }

  return JSON.parse(trimmed) as T;
}

/**
 * Retry an async operation with exponential backoff.
 *
 * When a `trace` is supplied, each attempt is recorded so the envelope
 * can surface accurate attempt/retry counts.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  trace?: CallTrace,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    trace?.recordAttempt();
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === RETRY_CONFIG.maxAttempts) break;
      const delay =
        RETRY_CONFIG.initialDelayMs *
        Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1);
      await sleep(delay);
    }
  }
  throw new GeminiError(
    `${label} failed after ${RETRY_CONFIG.maxAttempts} attempts`,
    {
      cause: lastError,
      attempts: RETRY_CONFIG.maxAttempts,
      reason: classifyError(lastError),
    },
  );
}

/** Abortable sleep used by the retry helper. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clamp a number into [min, max]. Useful for normalizing AI-produced scores. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Stable ID suitable for ephemeral AI message/insight records. */
export function generateId(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/** True when a Gemini API key is available in the current environment. */
export function hasGeminiApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === "string" && key.trim() !== "";
}
