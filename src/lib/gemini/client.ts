/**
 * Gemini client.
 *
 * Thin wrapper around @google/generative-ai that:
 *  - lazily initializes a singleton client (server-only)
 *  - centralizes generation config, timeouts, and retries
 *  - enables native JSON-mode with response schemas for structured calls
 *  - exposes typed helpers for text and schema-constrained JSON generation
 *
 * Callers should prefer the higher-level functions in `./services.ts`
 * over using this client directly.
 */

import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type GenerationConfig,
  type Schema,
} from "@google/generative-ai";

import {
  DEFAULT_GENERATION_CONFIG,
  GEMINI_MODEL,
  REQUEST_TIMEOUT_MS,
  getGeminiApiKey,
  type GeminiGenerationConfig,
} from "./config";
import {
  CallTrace,
  GeminiError,
  parseJsonResponse,
  withRetry,
} from "./helpers";

let cachedClient: GoogleGenerativeAI | null = null;

/** Lazily construct (and cache) the Gemini SDK client. Server-only. */
export function getGeminiClient(): GoogleGenerativeAI {
  if (typeof window !== "undefined") {
    throw new Error("getGeminiClient must not be called from client-side code.");
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(getGeminiApiKey());
  }
  return cachedClient;
}

export interface GenerateOptions {
  systemInstruction?: string;
  generationConfig?: Partial<GeminiGenerationConfig>;
  /** Override the default model (e.g. for a more capable tier). */
  model?: string;
  /**
   * Native response schema that constrains Gemini output at generation
   * time. When set, the client also sets `responseMimeType` to JSON.
   */
  responseSchema?: Schema;
  /** Optional trace for observability. Mutated by the client on attempts. */
  trace?: CallTrace;
}

/** Resolve a `GenerativeModel` ready to call `generateContent` on. */
function resolveModel(opts: GenerateOptions = {}): GenerativeModel {
  const client = getGeminiClient();
  const config: GenerationConfig = {
    ...DEFAULT_GENERATION_CONFIG,
    ...opts.generationConfig,
  };
  if (opts.responseSchema) {
    config.responseMimeType = "application/json";
    config.responseSchema = opts.responseSchema;
  }
  return client.getGenerativeModel({
    model: opts.model ?? GEMINI_MODEL,
    generationConfig: config,
    systemInstruction: opts.systemInstruction,
  });
}

/** Race a promise against the configured request timeout. */
async function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new GeminiError(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`, {
              reason: "gemini_timeout",
            }),
          ),
        REQUEST_TIMEOUT_MS,
      ),
    ),
  ]);
}

/**
 * Generate plain text from Gemini. Retries on transient errors.
 * Returns the raw string content; downstream code is responsible
 * for any parsing.
 */
export async function generateText(
  prompt: string,
  opts: GenerateOptions = {},
): Promise<string> {
  const model = resolveModel(opts);
  return withRetry(
    async () => {
      const result = await withTimeout(
        model.generateContent(prompt),
        "generateText",
      );
      const text = result.response.text();
      if (!text || text.trim() === "") {
        throw new GeminiError("Gemini returned an empty response.", {
          reason: "gemini_empty",
        });
      }
      return text;
    },
    "generateText",
    opts.trace,
  );
}

/**
 * Generate a typed JSON payload from Gemini.
 *
 * When `responseSchema` is supplied, Gemini enforces the schema natively
 * at generation time and no prompt-level JSON reminder is needed. When
 * no schema is supplied we still add a terse "respond with JSON only"
 * suffix and best-effort parse the response.
 */
export async function generateJson<T>(
  prompt: string,
  opts: GenerateOptions = {},
): Promise<T> {
  const hasSchema = !!opts.responseSchema;
  const finalPrompt = hasSchema
    ? prompt
    : `${prompt}\n\nRespond with strict JSON only. Do not include commentary, markdown, or code fences.`;

  const text = await generateText(finalPrompt, opts);

  try {
    return parseJsonResponse<T>(text);
  } catch (err) {
    throw new GeminiError("Failed to parse JSON from Gemini response.", {
      cause: err,
      reason: "schema_validation_failed",
    });
  }
}
