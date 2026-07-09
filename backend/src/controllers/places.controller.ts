import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import {
  autocompletePlaces,
  geocodeLocation,
  searchNearbyPlaces,
} from "../services/googlePlaces.service";

const RADII_METERS = [1000, 3000, 5000, 10000] as const;

const searchQuerySchema = z.object({
  location: z.string().min(2).max(200),
  category: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minReviews: z.coerce.number().int().min(0).optional(),
  radiusMeters: z.coerce
    .number()
    .refine((v) => (RADII_METERS as readonly number[]).includes(v), {
      message: `radiusMeters must be one of ${RADII_METERS.join(", ")}`,
    })
    .optional()
    .default(3000),
  sortBy: z.enum(["rating", "reviews", "distance"]).optional().default("distance"),
});

const autocompleteQuerySchema = z.object({
  input: z.string().min(1).max(200),
});

export const searchPlaces = asyncHandler(async (req: Request, res: Response) => {
  const query = searchQuerySchema.parse(req.query);

  const center = await geocodeLocation(query.location);
  const places = await searchNearbyPlaces({
    lat: center.lat,
    lng: center.lng,
    radiusMeters: query.radiusMeters,
    category: query.category,
    minRating: query.minRating,
    minReviews: query.minReviews,
    sortBy: query.sortBy,
  });

  res.json({
    center: { lat: center.lat, lng: center.lng, formattedAddress: center.formattedAddress },
    places,
  });
});

export const autocomplete = asyncHandler(async (req: Request, res: Response) => {
  const query = autocompleteQuerySchema.parse(req.query);
  const suggestions = await autocompletePlaces(query.input);
  res.json({ suggestions });
});
