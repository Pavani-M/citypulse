import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import type { CollectionPlaceRow, CollectionRow } from "../types";

function serializePlace(row: CollectionPlaceRow) {
  return {
    placeId: row.place_id,
    name: row.name,
    category: row.category,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    photoUrl: row.photo_url,
    savedAt: row.created_at,
  };
}

async function serializeCollection(row: CollectionRow) {
  const places = await pool.query<CollectionPlaceRow>(
    "SELECT * FROM collection_places WHERE collection_id = $1 ORDER BY created_at DESC",
    [row.id],
  );
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    places: places.rows.map(serializePlace),
  };
}

/** Loads a collection and 404s (rather than leaking existence via 403) if it isn't owned by the caller. */
async function requireOwnedCollection(collectionId: string, userId: string) {
  const result = await pool.query<CollectionRow>(
    "SELECT * FROM collections WHERE id = $1 AND user_id = $2",
    [collectionId, userId],
  );
  const collection = result.rows[0];
  if (!collection) throw ApiError.notFound("Collection not found");
  return collection;
}

export const listCollections = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();

  const result = await pool.query<CollectionRow>(
    "SELECT * FROM collections WHERE user_id = $1 ORDER BY created_at ASC",
    [req.auth.userId],
  );
  const collections = await Promise.all(result.rows.map(serializeCollection));
  res.json({ collections });
});

const nameSchema = z.object({ name: z.string().trim().min(1).max(80) });

export const createCollection = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { name } = nameSchema.parse(req.body);

  const existing = await pool.query(
    "SELECT 1 FROM collections WHERE user_id = $1 AND name = $2",
    [req.auth.userId, name],
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw ApiError.conflict("You already have a collection with that name");
  }

  const result = await pool.query<CollectionRow>(
    "INSERT INTO collections (user_id, name) VALUES ($1, $2) RETURNING *",
    [req.auth.userId, name],
  );
  res.status(201).json({ collection: await serializeCollection(result.rows[0]) });
});

export const renameCollection = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { name } = nameSchema.parse(req.body);
  await requireOwnedCollection(req.params.id, req.auth.userId);

  const existing = await pool.query(
    "SELECT 1 FROM collections WHERE user_id = $1 AND name = $2 AND id != $3",
    [req.auth.userId, name, req.params.id],
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw ApiError.conflict("You already have a collection with that name");
  }

  const result = await pool.query<CollectionRow>(
    "UPDATE collections SET name = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [name, req.params.id],
  );
  res.json({ collection: await serializeCollection(result.rows[0]) });
});

export const deleteCollection = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await requireOwnedCollection(req.params.id, req.auth.userId);
  await pool.query("DELETE FROM collections WHERE id = $1", [req.params.id]);
  res.status(204).send();
});

const addPlaceSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  photoUrl: z.string().nullable().optional(),
});

export const addPlaceToCollection = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await requireOwnedCollection(req.params.id, req.auth.userId);
  const body = addPlaceSchema.parse(req.body);

  const result = await pool.query<CollectionPlaceRow>(
    `INSERT INTO collection_places (collection_id, place_id, name, category, address, lat, lng, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (collection_id, place_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [
      req.params.id,
      body.placeId,
      body.name,
      body.category ?? null,
      body.address ?? null,
      body.lat ?? null,
      body.lng ?? null,
      body.photoUrl ?? null,
    ],
  );
  res.status(201).json({ place: serializePlace(result.rows[0]) });
});

export const removePlaceFromCollection = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await requireOwnedCollection(req.params.id, req.auth.userId);

  await pool.query("DELETE FROM collection_places WHERE collection_id = $1 AND place_id = $2", [
    req.params.id,
    req.params.placeId,
  ]);
  res.status(204).send();
});
