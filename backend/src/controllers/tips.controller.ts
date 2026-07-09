import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import type { TipRow, UserRole } from "../types";

const SORTS = ["helpful", "newest", "verified", "pinned"] as const;
type TipSort = (typeof SORTS)[number];

const SORT_CLAUSES: Record<TipSort, string> = {
  helpful: "(t.upvote_count - t.downvote_count) DESC, t.created_at DESC",
  newest: "t.created_at DESC",
  verified: "(u.role = 'business_rep') DESC, (t.upvote_count - t.downvote_count) DESC, t.created_at DESC",
  pinned: "t.is_pinned DESC, (t.upvote_count - t.downvote_count) DESC, t.created_at DESC",
};

/** Sum of upvotes across all of an author's tips at/above this earns the "Top Contributor" badge. */
const TOP_CONTRIBUTOR_UPVOTE_THRESHOLD = 10;
/** Tips with this many reports are hidden from everyone except their own author. */
const REPORT_HIDE_THRESHOLD = 5;

const bodySchema = z.object({ body: z.string().trim().min(1).max(250) });
const listQuerySchema = z.object({ sort: z.enum(SORTS).optional().default("helpful") });
const voteSchema = z.object({ value: z.union([z.literal(1), z.literal(-1)]) });
const pinSchema = z.object({ pinned: z.boolean() });

type TipRowWithExtras = TipRow & {
  user_name: string | null;
  user_role: UserRole;
  author_total_upvotes: string | number;
  my_vote: number | null;
  is_reported_by_me: boolean;
};

function serializeTip(row: TipRowWithExtras) {
  return {
    id: row.id,
    placeId: row.place_id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    body: row.body,
    upvoteCount: row.upvote_count,
    downvoteCount: row.downvote_count,
    reportCount: row.report_count,
    isPinned: row.is_pinned,
    myVote: row.my_vote ?? null,
    isReportedByMe: row.is_reported_by_me ?? false,
    isTopContributor: Number(row.author_total_upvotes) >= TOP_CONTRIBUTOR_UPVOTE_THRESHOLD,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Loads a tip and 404s (rather than leaking existence via 403) if it isn't owned by the caller. */
async function requireOwnedTip(tipId: string, userId: string) {
  const result = await pool.query<TipRow>("SELECT * FROM tips WHERE id = $1 AND user_id = $2", [
    tipId,
    userId,
  ]);
  const tip = result.rows[0];
  if (!tip) throw ApiError.notFound("Tip not found");
  return tip;
}

export const listTips = asyncHandler(async (req: Request, res: Response) => {
  const { placeId } = req.params;
  const { sort } = listQuerySchema.parse(req.query);
  const currentUserId = req.auth?.userId ?? null;

  const result = await pool.query<TipRowWithExtras>(
    `SELECT t.*, u.name AS user_name, u.role AS user_role,
            (SELECT COALESCE(SUM(t2.upvote_count), 0) FROM tips t2 WHERE t2.user_id = t.user_id) AS author_total_upvotes,
            (SELECT v.value FROM tip_votes v WHERE v.tip_id = t.id AND v.user_id = $2) AS my_vote,
            EXISTS (SELECT 1 FROM tip_reports r WHERE r.tip_id = t.id AND r.user_id = $2) AS is_reported_by_me
     FROM tips t
     JOIN users u ON u.id = t.user_id
     WHERE t.place_id = $1 AND (t.report_count < ${REPORT_HIDE_THRESHOLD} OR t.user_id = $2)
     ORDER BY ${SORT_CLAUSES[sort]}`,
    [placeId, currentUserId],
  );

  res.json({ tips: result.rows.map(serializeTip) });
});

export const createTip = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { placeId } = req.params;
  const { body } = bodySchema.parse(req.body);

  const result = await pool.query<TipRow>(
    "INSERT INTO tips (place_id, user_id, body) VALUES ($1, $2, $3) RETURNING *",
    [placeId, req.auth.userId, body],
  );

  const [row] = await hydrateTips(result.rows, req.auth.userId);
  res.status(201).json({ tip: row });
});

export const updateTip = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { tipId } = req.params;
  const { body } = bodySchema.parse(req.body);
  await requireOwnedTip(tipId, req.auth.userId);

  const result = await pool.query<TipRow>(
    "UPDATE tips SET body = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [body, tipId],
  );

  const [row] = await hydrateTips(result.rows, req.auth.userId);
  res.json({ tip: row });
});

export const deleteTip = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await requireOwnedTip(req.params.tipId, req.auth.userId);
  await pool.query("DELETE FROM tips WHERE id = $1", [req.params.tipId]);
  res.status(204).send();
});

export const voteTip = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { tipId } = req.params;
  const { value } = voteSchema.parse(req.body);
  const userId = req.auth.userId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tipRow = await client.query("SELECT id FROM tips WHERE id = $1 FOR UPDATE", [tipId]);
    if (tipRow.rows.length === 0) {
      await client.query("ROLLBACK");
      throw ApiError.notFound("Tip not found");
    }

    const existing = await client.query<{ value: number }>(
      "SELECT value FROM tip_votes WHERE tip_id = $1 AND user_id = $2",
      [tipId, userId],
    );
    const existingVote = existing.rows[0]?.value;

    if (existingVote === value) {
      await client.query("DELETE FROM tip_votes WHERE tip_id = $1 AND user_id = $2", [tipId, userId]);
      const column = value === 1 ? "upvote_count" : "downvote_count";
      await client.query(
        `UPDATE tips SET ${column} = GREATEST(${column} - 1, 0), updated_at = now() WHERE id = $1`,
        [tipId],
      );
    } else if (existingVote !== undefined) {
      await client.query("UPDATE tip_votes SET value = $1 WHERE tip_id = $2 AND user_id = $3", [
        value,
        tipId,
        userId,
      ]);
      const oldColumn = value === 1 ? "downvote_count" : "upvote_count";
      const newColumn = value === 1 ? "upvote_count" : "downvote_count";
      await client.query(
        `UPDATE tips SET ${oldColumn} = GREATEST(${oldColumn} - 1, 0), ${newColumn} = ${newColumn} + 1, updated_at = now() WHERE id = $1`,
        [tipId],
      );
    } else {
      await client.query("INSERT INTO tip_votes (tip_id, user_id, value) VALUES ($1, $2, $3)", [
        tipId,
        userId,
        value,
      ]);
      const column = value === 1 ? "upvote_count" : "downvote_count";
      await client.query(`UPDATE tips SET ${column} = ${column} + 1, updated_at = now() WHERE id = $1`, [
        tipId,
      ]);
    }

    const updated = await client.query<TipRow>("SELECT * FROM tips WHERE id = $1", [tipId]);
    await client.query("COMMIT");

    const [row] = await hydrateTips(updated.rows, userId);
    res.json({ tip: row });
  } finally {
    client.release();
  }
});

export const reportTip = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { tipId } = req.params;

  const tipExists = await pool.query("SELECT id FROM tips WHERE id = $1", [tipId]);
  if (tipExists.rows.length === 0) throw ApiError.notFound("Tip not found");

  try {
    await pool.query("INSERT INTO tip_reports (tip_id, user_id) VALUES ($1, $2)", [tipId, req.auth.userId]);
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw ApiError.conflict("You've already reported this tip");
    }
    throw err;
  }

  const result = await pool.query<TipRow>(
    "UPDATE tips SET report_count = report_count + 1, updated_at = now() WHERE id = $1 RETURNING *",
    [tipId],
  );
  const [row] = await hydrateTips(result.rows, req.auth.userId);
  res.json({ tip: row });
});

export const pinTip = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { tipId } = req.params;
  const { pinned } = pinSchema.parse(req.body);

  const result = await pool.query<TipRow>(
    "UPDATE tips SET is_pinned = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [pinned, tipId],
  );
  if (result.rows.length === 0) throw ApiError.notFound("Tip not found");

  const [row] = await hydrateTips(result.rows, req.auth.userId);
  res.json({ tip: row });
});

/** Re-fetches author name/role and vote/report state for freshly written tip rows. */
async function hydrateTips(rows: TipRow[], currentUserId: string | null) {
  if (rows.length === 0) return [];
  const result = await pool.query<TipRowWithExtras>(
    `SELECT t.*, u.name AS user_name, u.role AS user_role,
            (SELECT COALESCE(SUM(t2.upvote_count), 0) FROM tips t2 WHERE t2.user_id = t.user_id) AS author_total_upvotes,
            (SELECT v.value FROM tip_votes v WHERE v.tip_id = t.id AND v.user_id = $2) AS my_vote,
            EXISTS (SELECT 1 FROM tip_reports r WHERE r.tip_id = t.id AND r.user_id = $2) AS is_reported_by_me
     FROM tips t
     JOIN users u ON u.id = t.user_id
     WHERE t.id = ANY($1::uuid[])`,
    [rows.map((r) => r.id), currentUserId],
  );
  const byId = new Map(result.rows.map((row) => [row.id, row]));
  return rows.map((row) => serializeTip(byId.get(row.id)!));
}
