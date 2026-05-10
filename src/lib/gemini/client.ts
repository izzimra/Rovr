/**
 * Gemini client.
 *
 * Thin wrapper around @google/generative-ai that:
 *  - lazily initializes a singleton client (server-only)
 *  - centralizes generation config, timeouts, and retries
 *  - exposes typed helpers for text and JSON generation
 *
 * Callers should prefer the higher-level functions in `./services.ts`
 * over using this client directly.
 */

import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type GenerationConfig,
} from "@google/generative-ai";

import {
  DEFAULT_GENERATION_CONFIG,
  GEMINI_MODEL,
  REQUEST_TIMEOUT_MS,
  getGeminiApiKey,
  type GeminiGenerationConfig,
} from "./config";
import { GeminiError, parseJsonResponse, withRetry } from "./helpers";

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
}

/** Resolve a `GenerativeModel` ready to call `generateContent` on. */
function resolveModel(opts: GenerateOptions = {}): GenerativeModel {
  const client = getGeminiClient();
  const config: GenerationConfig = {
    ...DEFAULT_GENERATION_CONFIG,
    ...opts.generationConfig,
  };
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
        () => reject(new GeminiError(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`)),
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
  return withRetry(async () => {
    const result = await withTimeout(model.generateContent(prompt), "generateText");
    const text = result.response.text();
    if (!text || text.trim() === "") {
      throw new GeminiError("Gemini returned an empty response.");
    }
    return text;
  }, "generateText");
}

/**
 * Generate a typed JSON payload from Gemini.
 *
 * Adds a strict "respond with JSON only" suffix to the prompt and parses
 * the response via the shared JSON helper. The caller's type `T` is the
 * contract the prompt is expected to honor.
 */
export async function generateJson<T>(
  prompt: string,
  opts: GenerateOptions = {},
): Promise<T> {
  const hardenedPrompt = `${prompt}\n\nRespond with strict JSON only. Do not include commentary, markdown, or code fences.`;
  const text = await generateText(hardenedPrompt, {
    ...opts,
    generationConfig: {
      ...opts.generationConfig,
      // `responseMimeType` nudges the model into JSON mode when supported.
    },
  });
  try {
    return parseJsonResponse<T>(text);
  } catch (err) {
    throw new GeminiError("Failed to parse JSON from Gemini response.", { cause: err });
  }
}
