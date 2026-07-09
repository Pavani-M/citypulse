import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import type { VisitRow } from "../types";

function serializeVisit(row: VisitRow) {
  return {
    id: row.id,
    placeId: row.place_id,
    placeName: row.place_name,
    placeCategory: row.place_category,
    placeAddress: row.place_address,
    placePhotoUrl: row.place_photo_url,
    visitDate: row.visit_date,
    purpose: row.purpose,
    servicesUsed: row.services_used,
    itemsPurchased: row.items_purchased,
    amountSpent: row.amount_spent === null ? null : Number(row.amount_spent),
    rating: row.rating,
    waitingMinutes: row.waiting_minutes,
    photos: row.photos,
    notes: row.notes,
    wouldVisitAgain: row.would_visit_again,
    privacy: row.privacy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Loads a visit and 404s (rather than leaking existence via 403) if it isn't owned by the caller. */
async function requireOwnedVisit(visitId: string, userId: string) {
  const result = await pool.query<VisitRow>("SELECT * FROM visits WHERE id = $1 AND user_id = $2", [
    visitId,
    userId,
  ]);
  const visit = result.rows[0];
  if (!visit) throw ApiError.notFound("Visit not found");
  return visit;
}

export const listVisits = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const placeId = typeof req.query.placeId === "string" ? req.query.placeId : undefined;

  const result = await pool.query<VisitRow>(
    placeId
      ? "SELECT * FROM visits WHERE user_id = $1 AND place_id = $2 ORDER BY visit_date DESC, created_at DESC"
      : "SELECT * FROM visits WHERE user_id = $1 ORDER BY visit_date DESC, created_at DESC",
    placeId ? [req.auth.userId, placeId] : [req.auth.userId],
  );
  res.json({ visits: result.rows.map(serializeVisit) });
});

export const getVisitStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();

  const result = await pool.query<VisitRow>("SELECT * FROM visits WHERE user_id = $1", [req.auth.userId]);
  const visits = result.rows;

  const totalVisits = visits.length;
  const totalSpent = visits.reduce((sum, v) => sum + (v.amount_spent === null ? 0 : Number(v.amount_spent)), 0);

  const categoryCounts = new Map<string, number>();
  for (const v of visits) {
    if (!v.place_category) continue;
    categoryCounts.set(v.place_category, (categoryCounts.get(v.place_category) ?? 0) + 1);
  }
  const categoriesVisited = categoryCounts.size;
  let favoriteCategory: string | null = null;
  let favoriteCount = 0;
  for (const [category, count] of categoryCounts) {
    if (count > favoriteCount) {
      favoriteCategory = category;
      favoriteCount = count;
    }
  }

  const monthCounts = new Map<string, number>();
  for (const v of visits) {
    const date = new Date(v.visit_date);
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }
  const monthlyActivity = [...monthCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  res.json({
    totalVisits,
    totalSpent,
    categoriesVisited,
    favoriteCategory,
    monthlyActivity,
  });
});

const privacySchema = z.enum(["public", "private", "friends"]);

const createVisitSchema = z.object({
  placeId: z.string().min(1),
  placeName: z.string().min(1),
  placeCategory: z.string().nullable().optional(),
  placeAddress: z.string().nullable().optional(),
  placePhotoUrl: z.string().nullable().optional(),
  visitDate: z.string().min(1),
  purpose: z.string().max(200).nullable().optional(),
  servicesUsed: z.array(z.string().min(1).max(80)).max(30).optional(),
  itemsPurchased: z.array(z.string().min(1).max(80)).max(30).optional(),
  amountSpent: z.number().nonnegative().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  waitingMinutes: z.number().int().nonnegative().nullable().optional(),
  photos: z.array(z.string().min(1)).max(20).optional(),
  notes: z.string().max(2000).nullable().optional(),
  wouldVisitAgain: z.boolean().nullable().optional(),
  privacy: privacySchema.default("private"),
});

const updateVisitSchema = createVisitSchema
  .omit({ placeId: true, placeName: true, placeCategory: true, placeAddress: true, placePhotoUrl: true })
  .partial();

export const createVisit = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const body = createVisitSchema.parse(req.body);

  const result = await pool.query<VisitRow>(
    `INSERT INTO visits (
       user_id, place_id, place_name, place_category, place_address, place_photo_url,
       visit_date, purpose, services_used, items_purchased, amount_spent, rating,
       waiting_minutes, photos, notes, would_visit_again, privacy
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      req.auth.userId,
      body.placeId,
      body.placeName,
      body.placeCategory ?? null,
      body.placeAddress ?? null,
      body.placePhotoUrl ?? null,
      body.visitDate,
      body.purpose ?? null,
      body.servicesUsed ?? [],
      body.itemsPurchased ?? [],
      body.amountSpent ?? null,
      body.rating ?? null,
      body.waitingMinutes ?? null,
      body.photos ?? [],
      body.notes ?? null,
      body.wouldVisitAgain ?? null,
      body.privacy,
    ],
  );
  res.status(201).json({ visit: serializeVisit(result.rows[0]) });
});

export const updateVisit = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await requireOwnedVisit(req.params.id, req.auth.userId);
  const body = updateVisitSchema.parse(req.body);

  const fields: Record<string, unknown> = {
    visit_date: body.visitDate,
    purpose: body.purpose,
    services_used: body.servicesUsed,
    items_purchased: body.itemsPurchased,
    amount_spent: body.amountSpent,
    rating: body.rating,
    waiting_minutes: body.waitingMinutes,
    photos: body.photos,
    notes: body.notes,
    would_visit_again: body.wouldVisitAgain,
    privacy: body.privacy,
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];
  for (const [column, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }

  if (setClauses.length === 0) {
    res.json({ visit: serializeVisit(await requireOwnedVisit(req.params.id, req.auth.userId)) });
    return;
  }

  values.push(req.params.id);
  const result = await pool.query<VisitRow>(
    `UPDATE visits SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values,
  );
  res.json({ visit: serializeVisit(result.rows[0]) });
});

export const deleteVisit = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await requireOwnedVisit(req.params.id, req.auth.userId);
  await pool.query("DELETE FROM visits WHERE id = $1", [req.params.id]);
  res.status(204).send();
});
