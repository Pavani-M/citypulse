import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import type { BusinessRequest, SavedPlaceRow } from "../types";

const savePlaceSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
  category: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  userRatingsTotal: z.number().int().min(0).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  photoUrl: z.string().optional(),
});

function serializeSavedPlace(row: SavedPlaceRow) {
  return {
    id: row.id,
    placeId: row.place_id,
    name: row.name,
    address: row.address,
    category: row.category,
    rating: row.rating,
    userRatingsTotal: row.user_ratings_total,
    lat: row.lat,
    lng: row.lng,
    photoUrl: row.photo_url,
    savedAt: row.created_at,
  };
}

export const listSavedPlaces = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();

  const result = await pool.query<SavedPlaceRow>(
    "SELECT * FROM saved_places WHERE user_id = $1 ORDER BY created_at DESC",
    [req.auth.userId],
  );
  res.json({ savedPlaces: result.rows.map(serializeSavedPlace) });
});

export const savePlace = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const body = savePlaceSchema.parse(req.body);

  const result = await pool.query<SavedPlaceRow>(
    `INSERT INTO saved_places (user_id, place_id, name, address, category, rating, user_ratings_total, lat, lng, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id, place_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [
      req.auth.userId,
      body.placeId,
      body.name,
      body.address ?? null,
      body.category ?? null,
      body.rating ?? null,
      body.userRatingsTotal ?? null,
      body.lat ?? null,
      body.lng ?? null,
      body.photoUrl ?? null,
    ],
  );

  res.status(201).json({ savedPlace: serializeSavedPlace(result.rows[0]) });
});

export const unsavePlace = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { placeId } = req.params;

  await pool.query("DELETE FROM saved_places WHERE user_id = $1 AND place_id = $2", [
    req.auth.userId,
    placeId,
  ]);
  res.status(204).send();
});

export const listUpvotedRequests = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();

  const result = await pool.query<BusinessRequest>(
    `SELECT r.* FROM requests r
     JOIN upvotes u ON u.request_id = r.id
     WHERE u.user_id = $1
     ORDER BY u.created_at DESC`,
    [req.auth.userId],
  );

  res.json({
    requests: result.rows.map((r) => ({
      id: r.id,
      businessName: r.business_name,
      sourceCity: r.source_city,
      targetCity: r.target_city,
      category: r.category,
      description: r.description,
      upvoteCount: r.upvote_count,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
});

/** Requests created by the current user — used by the business dashboard. */
export const listMyRequests = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();

  const result = await pool.query<BusinessRequest>(
    "SELECT * FROM requests WHERE created_by = $1 ORDER BY created_at DESC",
    [req.auth.userId],
  );

  res.json({
    requests: result.rows.map((r) => ({
      id: r.id,
      businessName: r.business_name,
      sourceCity: r.source_city,
      targetCity: r.target_city,
      category: r.category,
      description: r.description,
      upvoteCount: r.upvote_count,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
});
