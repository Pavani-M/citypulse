import { GoogleGenAI, ApiError as GeminiApiError } from "@google/genai";
import { z } from "zod";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import type { Place } from "../types";

let client: GoogleGenAI | null = null;

function requireGeminiKey() {
  if (!env.geminiApiKey) {
    throw ApiError.badRequest(
      "GEMINI_API_KEY is not set. Add it to backend/.env to use the AI Concierge.",
    );
  }
}

function getClient() {
  requireGeminiKey();
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

// responseJsonSchema only supports a subset of JSON Schema (see @google/genai's
// GenerateContentConfig.responseJsonSchema doc comment) — no `type: [x, "null"]`
// arrays, so nullable fields are expressed as anyOf [type, null] instead.
const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });

const IntentSchema = z.object({
  type: z.enum(["itinerary", "recommendation"]),
  locationQuery: z.string().nullable(),
  budgetInr: z.number().nullable(),
  categories: z.array(z.string()).min(1).max(4),
  specialtyKeywords: z.string().nullable(),
  minRating: z.number().nullable(),
  maxDistanceMeters: z.number().nullable(),
});
export type ConciergeIntent = z.infer<typeof IntentSchema>;

const INTENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["itinerary", "recommendation"] },
    locationQuery: nullable({ type: "string" }),
    budgetInr: nullable({ type: "number" }),
    categories: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
    specialtyKeywords: nullable({ type: "string" }),
    minRating: nullable({ type: "number" }),
    maxDistanceMeters: nullable({ type: "number" }),
  },
  required: [
    "type",
    "locationQuery",
    "budgetInr",
    "categories",
    "specialtyKeywords",
    "minRating",
    "maxDistanceMeters",
  ],
  additionalProperties: false,
};

const ItineraryOutputSchema = z.object({
  stops: z
    .array(
      z.object({
        time: z.string(),
        label: z.string(),
        placeId: z.string().nullable(),
        placeName: z.string(),
        category: z.string(),
        estimatedCostInr: z.number(),
        distanceMeters: z.number().nullable(),
      }),
    )
    .min(1)
    .max(6),
  estimatedTotalCostInr: z.number(),
  drivingDistanceKm: z.number().nullable(),
  parkingAvailable: z.boolean(),
  notes: z.string().nullable(),
});
export type ItineraryOutput = z.infer<typeof ItineraryOutputSchema>;

const ITINERARY_JSON_SCHEMA = {
  type: "object",
  properties: {
    stops: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          time: { type: "string", description: '24h "HH:MM"' },
          label: { type: "string" },
          placeId: nullable({ type: "string" }),
          placeName: { type: "string" },
          category: { type: "string" },
          estimatedCostInr: { type: "number" },
          distanceMeters: nullable({ type: "number" }),
        },
        required: ["time", "label", "placeId", "placeName", "category", "estimatedCostInr", "distanceMeters"],
        additionalProperties: false,
      },
    },
    estimatedTotalCostInr: { type: "number" },
    drivingDistanceKm: nullable({ type: "number" }),
    parkingAvailable: { type: "boolean" },
    notes: nullable({ type: "string" }),
  },
  required: ["stops", "estimatedTotalCostInr", "drivingDistanceKm", "parkingAvailable", "notes"],
  additionalProperties: false,
};

const RecommendationOutputSchema = z.object({
  items: z
    .array(
      z.object({
        placeId: z.string().nullable(),
        placeName: z.string(),
        reason: z.string(),
        estimatedCostInr: z.number().nullable(),
        distanceMeters: z.number().nullable(),
        rating: z.number().nullable(),
      }),
    )
    .min(1)
    .max(6),
  notes: z.string().nullable(),
});
export type RecommendationOutput = z.infer<typeof RecommendationOutputSchema>;

const RECOMMENDATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          placeId: nullable({ type: "string" }),
          placeName: { type: "string" },
          reason: { type: "string" },
          estimatedCostInr: nullable({ type: "number" }),
          distanceMeters: nullable({ type: "number" }),
          rating: nullable({ type: "number" }),
        },
        required: ["placeId", "placeName", "reason", "estimatedCostInr", "distanceMeters", "rating"],
        additionalProperties: false,
      },
    },
    notes: nullable({ type: "string" }),
  },
  required: ["items", "notes"],
  additionalProperties: false,
};

/** Runs a Gemini structured-output call and validates the parsed JSON against a Zod schema. */
async function callGemini<T>(
  systemInstruction: string,
  userContent: string,
  responseJsonSchema: object,
  zodSchema: z.ZodType<T>,
  failureMessage: string,
): Promise<T> {
  const gemini = getClient();
  try {
    const response = await gemini.models.generateContent({
      model: env.geminiModel,
      contents: userContent,
      config: { systemInstruction, responseMimeType: "application/json", responseJsonSchema },
    });
    if (!response.text) throw ApiError.badRequest(failureMessage);
    const parsed = zodSchema.safeParse(JSON.parse(response.text));
    if (!parsed.success) throw ApiError.badRequest(failureMessage);
    return parsed.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof GeminiApiError) {
      if (err.status === 429) {
        throw new ApiError(429, "AI Concierge is rate-limited right now — try again shortly.");
      }
      throw new ApiError(502, "The AI Concierge had a problem — try again shortly.");
    }
    throw new ApiError(503, "Couldn't reach the AI Concierge — try again shortly.");
  }
}

const INTENT_SYSTEM_PROMPT = `You extract structured search intent from a natural-language request to a local-places concierge for Indian cities. Prices and budgets are in INR (₹).

- type: "itinerary" if the user wants a sequence/plan of multiple stops (e.g. "date night", "plan my evening", "day out"). "recommendation" if they want the best single option or a ranked short list for one need (e.g. "best dermatologist", "a good gym near me").
- locationQuery: the locality/area/city they mentioned (e.g. "Jubilee Hills", "Madhapur"). Null only if genuinely absent from the message.
- budgetInr: total budget in INR if mentioned (e.g. "₹1500" -> 1500, "under ₹1000" -> 1000), else null.
- categories: 1-4 short lowercase search categories/business types to look up, e.g. ["park","cafe","restaurant","dessert"] for a date night, or ["dermatologist"] for a single medical need. For itineraries, order them in the sequence they'd logically happen (e.g. walk, then coffee, then dinner, then dessert).
- specialtyKeywords: extra descriptive keywords narrowing the category (e.g. "acne" for a dermatologist query), else null.
- minRating: a minimum star rating (0-5) if implied by words like "best"/"top-rated", else null.
- maxDistanceMeters: a distance constraint if mentioned, else null.

Respond with JSON only, matching the given schema exactly.`;

export async function extractIntent(message: string): Promise<ConciergeIntent> {
  return callGemini(
    INTENT_SYSTEM_PROMPT,
    message,
    INTENT_JSON_SCHEMA,
    IntentSchema,
    "Couldn't understand that request — try rephrasing it.",
  );
}

function serializeCandidates(places: Place[]) {
  return places.map((p) => ({
    placeId: p.placeId,
    name: p.name,
    category: p.category,
    address: p.address,
    distanceMeters: p.distanceMeters,
    rating: p.rating ?? null,
  }));
}

const COMPOSE_SYSTEM_PROMPT_BASE = `You are a local concierge for Indian cities, composing a response from real candidate places already fetched from a places-search API. Prices are in INR (₹).

CRITICAL: only reference places that appear in the provided candidates JSON (matching placeId and placeName exactly). Never invent a business. If a category has no good candidate, you may still include a generic stop for it with placeId set to null (name it plausibly for the area) and mention this limitation in "notes".

Respond with JSON only, matching the given schema exactly.`;

export async function composeItinerary(
  message: string,
  budgetInr: number | null,
  candidatesByCategory: Record<string, Place[]>,
  excludePlaceIds: string[],
): Promise<ItineraryOutput> {
  const candidatesJson = Object.fromEntries(
    Object.entries(candidatesByCategory).map(([category, places]) => [
      category,
      serializeCandidates(places.filter((p) => !excludePlaceIds.includes(p.placeId))),
    ]),
  );
  const system = `${COMPOSE_SYSTEM_PROMPT_BASE}

Build a timed itinerary of 2-5 sequential stops using the candidates. Assign realistic, sequential clock times (24h "HH:MM" strings) starting from a sensible hour for the request. Estimate a per-stop cost in INR and sum them toward (not exceeding, if avoidable) the stated budget of ${budgetInr ?? "an unspecified amount"}. Set parkingAvailable to your best judgement for the area/venue types. Set drivingDistanceKm to a rough estimate of total travel between stops based on the distances given.`;
  const userContent = `Original request: "${message}"\n\nCandidate places by category (JSON):\n${JSON.stringify(candidatesJson)}`;
  return callGemini(
    system,
    userContent,
    ITINERARY_JSON_SCHEMA,
    ItineraryOutputSchema,
    "Couldn't plan that itinerary — try rephrasing your request.",
  );
}

export async function composeRecommendation(
  message: string,
  candidates: Place[],
  excludePlaceIds: string[],
): Promise<RecommendationOutput> {
  const candidatesJson = serializeCandidates(
    candidates.filter((p) => !excludePlaceIds.includes(p.placeId)),
  );
  const system = `${COMPOSE_SYSTEM_PROMPT_BASE}

Rank up to 5 of the best-matching candidates for the request, each with a one-sentence reason tailored to what the user asked for (budget, specialty, rating, distance).`;
  const userContent = `Original request: "${message}"\n\nCandidate places (JSON):\n${JSON.stringify(candidatesJson)}`;
  return callGemini(
    system,
    userContent,
    RECOMMENDATION_JSON_SCHEMA,
    RecommendationOutputSchema,
    "Couldn't find a recommendation — try rephrasing your request.",
  );
}
