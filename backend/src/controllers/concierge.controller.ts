import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { geocodeLocation, searchNearbyPlaces } from "../services/places.service";
import { composeItinerary, composeRecommendation, extractIntent } from "../services/concierge.service";
import type { Place } from "../types";

const querySchema = z.object({
  message: z.string().trim().min(3).max(500),
  near: z.string().trim().min(2).max(200).optional(),
  excludePlaceIds: z.array(z.string()).optional().default([]),
});

const CANDIDATES_PER_CATEGORY = 6;
const SEARCH_RADIUS_METERS = 5000;

export const queryConcierge = asyncHandler(async (req: Request, res: Response) => {
  const body = querySchema.parse(req.body);

  const intent = await extractIntent(body.message);

  const locationQuery = intent.locationQuery ?? body.near;
  if (!locationQuery) {
    throw ApiError.badRequest("Please mention a location (e.g. an area, locality, or city).");
  }

  const center = await geocodeLocation(locationQuery);

  const categories = [...new Set(intent.categories)].slice(0, 4);
  const resultsByCategory = await Promise.all(
    categories.map(async (category) => {
      const places = await searchNearbyPlaces({
        lat: center.lat,
        lng: center.lng,
        radiusMeters: intent.maxDistanceMeters ?? SEARCH_RADIUS_METERS,
        category,
        minRating: intent.minRating ?? undefined,
        sortBy: intent.minRating ? "rating" : "distance",
      });
      return [category, places.slice(0, CANDIDATES_PER_CATEGORY)] as [string, Place[]];
    }),
  );
  const candidatesByCategory = Object.fromEntries(resultsByCategory);
  const allCandidates = resultsByCategory.flatMap(([, places]) => places);

  if (intent.type === "itinerary") {
    const result = await composeItinerary(
      body.message,
      intent.budgetInr,
      candidatesByCategory,
      body.excludePlaceIds,
    );
    const usedPlaceIds = result.stops.map((s) => s.placeId).filter((id): id is string => !!id);
    res.json({ type: "itinerary", result, usedPlaceIds });
    return;
  }

  const result = await composeRecommendation(body.message, allCandidates, body.excludePlaceIds);
  const usedPlaceIds = result.items.map((i) => i.placeId).filter((id): id is string => !!id);
  res.json({ type: "recommendation", result, usedPlaceIds });
});
