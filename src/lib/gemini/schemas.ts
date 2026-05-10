/**
 * Native Gemini response schemas.
 *
 * Gemini 2.5 Flash supports strict schema-constrained JSON generation
 * when you pass a `responseSchema` alongside `responseMimeType: "application/json"`.
 * Every schema here mirrors the internal type contract in `src/types/ai.ts`
 * so Gemini cannot produce fields we don't expect.
 *
 * Why this matters:
 *  - ~0% of "invalid JSON" failures compared to prompt-only JSON mode.
 *  - No hallucinated keys, so downstream parsing is nominal.
 *  - Enum constraints prevent drift on `severity` and `category` fields.
 */

import { SchemaType, type Schema } from "@google/generative-ai";

/** Strict schema for the prioritization endpoint. */
export const PRIORITIZATION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    rankings: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          customer_name: { type: SchemaType.STRING },
          score: { type: SchemaType.NUMBER },
          rank: { type: SchemaType.INTEGER },
          explanation: { type: SchemaType.STRING },
        },
        required: ["customer_name", "score", "rank", "explanation"],
      },
    },
  },
  required: ["rankings"],
};

/** Strict schema for a single customer-level explanation. */
export const CUSTOMER_REASONING_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    explanation: { type: SchemaType.STRING },
  },
  required: ["explanation"],
};

/** Strict schema for the daily executive brief. */
export const DAILY_BRIEF_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    headline: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    talkingPoints: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    topCustomer: { type: SchemaType.STRING },
  },
  required: ["headline", "summary", "talkingPoints", "topCustomer"],
};

/** Strict schema for route reasoning output. */
export const ROUTE_REASONING_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    headline: { type: SchemaType.STRING },
    reasoning: { type: SchemaType.STRING },
    highlights: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["headline", "reasoning", "highlights"],
};

/** Strict schema for the insights panel (4 cards). */
export const INSIGHTS_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    insights: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          category: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["opportunity", "risk", "strategy", "route_reasoning"],
          },
          title: { type: SchemaType.STRING },
          body: { type: SchemaType.STRING },
          severity: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["info", "positive", "warning", "critical"],
          },
          relatedCustomer: { type: SchemaType.STRING, nullable: true },
          cta: { type: SchemaType.STRING, nullable: true },
        },
        required: ["category", "title", "body", "severity"],
      },
    },
  },
  required: ["insights"],
};

/** Strict schema for the copilot chat reply. */
export const COPILOT_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: { type: SchemaType.STRING },
    suggestions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["reply", "suggestions"],
};
