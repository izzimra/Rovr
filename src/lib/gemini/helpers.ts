/**
 * Gemini helper utilities.
 *
 * Small, pure utilities used by the client and services:
 *  - structured-output parsing (tolerates ```json fences and prose wrappers)
 *  - exponential backoff for retry-safe calls
 *  - a shared error type for consistent failure surfaces
 */

import { RETRY_CONFIG } from "./config";

/** Error surfaced by Gemini calls once the retry budget is exhausted. */
export class GeminiError extends Error {
  override readonly cause: unknown;
  readonly attempts: number;

  constructor(message: string, opts: { cause?: unknown; attempts?: number } = {}) {
    super(message);
    this.name = "GeminiError";
    this.cause = opts.cause;
    this.attempts = opts.attempts ?? 1;
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
 * Preserves the original error chain via `GeminiError.cause` and reports
 * the attempt count for observability.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
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
  throw new GeminiError(`${label} failed after ${RETRY_CONFIG.maxAttempts} attempts`, {
    cause: lastError,
    attempts: RETRY_CONFIG.maxAttempts,
  });
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
