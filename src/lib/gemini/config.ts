/**
 * Gemini configuration.
 *
 * Single source of truth for model selection, generation parameters,
 * retry budget, and timeouts. Imported by the client, services, and
 * API routes so tuning happens in exactly one place.
 */

export const GEMINI_MODEL = "gemini-2.5-flash" as const;

export interface GeminiGenerationConfig {
  temperature: number;
  topP: number;
  maxOutputTokens: number;
}

/** Defaults tuned for short, structured, factual analytical output. */
export const DEFAULT_GENERATION_CONFIG: GeminiGenerationConfig = {
  temperature: 0.4,
  topP: 0.9,
  maxOutputTokens: 1024,
};

/** Slightly more creative, for daily briefs and narrative insights. */
export const NARRATIVE_GENERATION_CONFIG: GeminiGenerationConfig = {
  temperature: 0.7,
  topP: 0.95,
  maxOutputTokens: 1200,
};

/** Conservative, for ranking/scoring where determinism matters most. */
export const STRUCTURED_GENERATION_CONFIG: GeminiGenerationConfig = {
  temperature: 0.2,
  topP: 0.8,
  maxOutputTokens: 2048,
};

export const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 400,
  backoffFactor: 2,
} as const;

export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Reads the server-only Gemini API key. Throws on missing config rather
 * than returning undefined so callers fail loudly at the boundary.
 */
export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your server environment (see .env.example).",
    );
  }
  return key;
}
