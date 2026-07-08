import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import type { BusinessRequest, CommentRow, RequestUpdateRow } from "../types";

const CATEGORIES = ["restaurant", "cafe", "retail", "entertainment", "other"] as const;
const STATUSES = ["Requested", "Under Review", "Planned", "Coming Soon", "Not Planned"] as const;

const createRequestSchema = z.object({
  businessName: z.string().min(2).max(200),
  sourceCity: z.string().min(2).max(120),
  targetCity: z.string().min(2).max(120),
  category: z.enum(CATEGORIES),
  description: z.string().max(2000).optional(),
});

const listQuerySchema = z.object({
  targetCity: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(STATUSES).optional(),
  sort: z.enum(["top", "new"]).optional().default("top"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const updateSchema = z.object({
  message: z.string().min(1).max(2000),
  status: z.enum(STATUSES).optional(),
});

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

/** Maps a raw DB row (snake_case) to the camelCase shape the frontend expects. */
function serializeRequest(row: BusinessRequest & { is_upvoted_by_me?: boolean }) {
  return {
    id: row.id,
    businessName: row.business_name,
    sourceCity: row.source_city,
    targetCity: row.target_city,
    category: row.category,
    description: row.description,
    createdBy: row.created_by,
    upvoteCount: row.upvote_count,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isUpvotedByMe: row.is_upvoted_by_me ?? false,
  };
}

function serializeUpdate(row: RequestUpdateRow & { posted_by_name?: string }) {
  return {
    id: row.id,
    requestId: row.request_id,
    postedBy: row.posted_by,
    postedByName: row.posted_by_name ?? null,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
  };
}

function serializeComment(row: CommentRow & { user_name?: string }) {
  return {
    id: row.id,
    requestId: row.request_id,
    userId: row.user_id,
    userName: row.user_name ?? null,
    content: row.content,
    createdAt: row.created_at,
  };
}

export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const body = createRequestSchema.parse(req.body);

  const result = await pool.query<BusinessRequest>(
    `INSERT INTO requests (business_name, source_city, target_city, category, description, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [body.businessName, body.sourceCity, body.targetCity, body.category, body.description ?? null, req.auth.userId],
  );

  res.status(201).json({ request: serializeRequest(result.rows[0]) });
});

export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const currentUserId = req.auth?.userId ?? null;

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (query.targetCity) {
    values.push(query.targetCity);
    conditions.push(`r.target_city ILIKE $${values.length}`);
  }
  if (query.category) {
    values.push(query.category);
    conditions.push(`r.category = $${values.length}`);
  }
  if (query.status) {
    values.push(query.status);
    conditions.push(`r.status = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = query.sort === "new" ? "r.created_at DESC" : "r.upvote_count DESC, r.created_at DESC";

  values.push(currentUserId);
  const currentUserParam = values.length;
  values.push(query.pageSize);
  const limitParam = values.length;
  values.push((query.page - 1) * query.pageSize);
  const offsetParam = values.length;

  const result = await pool.query<BusinessRequest & { is_upvoted_by_me: boolean }>(
    `SELECT r.*,
            EXISTS (
              SELECT 1 FROM upvotes u WHERE u.request_id = r.id AND u.user_id = $${currentUserParam}
            ) AS is_upvoted_by_me
     FROM requests r
     ${where}
     ORDER BY ${orderBy}
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  );

  res.json({ requests: result.rows.map(serializeRequest), page: query.page, pageSize: query.pageSize });
});

export const getRequestById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.auth?.userId ?? null;

  const requestResult = await pool.query<BusinessRequest & { is_upvoted_by_me: boolean }>(
    `SELECT r.*,
            EXISTS (
              SELECT 1 FROM upvotes u WHERE u.request_id = r.id AND u.user_id = $2
            ) AS is_upvoted_by_me
     FROM requests r
     WHERE r.id = $1`,
    [id, currentUserId],
  );
  const request = requestResult.rows[0];
  if (!request) throw ApiError.notFound("Request not found");

  const [updatesResult, commentsResult] = await Promise.all([
    pool.query<RequestUpdateRow & { posted_by_name: string }>(
      `SELECT ru.*, u.name AS posted_by_name
       FROM request_updates ru
       JOIN users u ON u.id = ru.posted_by
       WHERE ru.request_id = $1
       ORDER BY ru.created_at ASC`,
      [id],
    ),
    pool.query<CommentRow & { user_name: string }>(
      `SELECT c.*, u.name AS user_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.request_id = $1
       ORDER BY c.created_at ASC`,
      [id],
    ),
  ]);

  res.json({
    request: serializeRequest(request),
    updates: updatesResult.rows.map(serializeUpdate),
    comments: commentsResult.rows.map(serializeComment),
  });
});

export const upvoteRequest = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestRow = await client.query("SELECT id FROM requests WHERE id = $1 FOR UPDATE", [id]);
    if (requestRow.rows.length === 0) {
      await client.query("ROLLBACK");
      throw ApiError.notFound("Request not found");
    }

    try {
      await client.query("INSERT INTO upvotes (request_id, user_id) VALUES ($1, $2)", [id, req.auth.userId]);
    } catch (err) {
      await client.query("ROLLBACK");
      if ((err as { code?: string }).code === "23505") {
        throw ApiError.conflict("You've already upvoted this request");
      }
      throw err;
    }

    const updated = await client.query<BusinessRequest>(
      "UPDATE requests SET upvote_count = upvote_count + 1, updated_at = now() WHERE id = $1 RETURNING *",
      [id],
    );
    await client.query("COMMIT");

    res.json({ request: serializeRequest({ ...updated.rows[0], is_upvoted_by_me: true }) });
  } finally {
    client.release();
  }
});

export const removeUpvote = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const deleted = await client.query("DELETE FROM upvotes WHERE request_id = $1 AND user_id = $2", [
      id,
      req.auth.userId,
    ]);

    if (deleted.rowCount === 0) {
      await client.query("ROLLBACK");
      throw ApiError.notFound("You haven't upvoted this request");
    }

    const updated = await client.query<BusinessRequest>(
      "UPDATE requests SET upvote_count = GREATEST(upvote_count - 1, 0), updated_at = now() WHERE id = $1 RETURNING *",
      [id],
    );
    await client.query("COMMIT");

    if (!updated.rows[0]) throw ApiError.notFound("Request not found");
    res.json({ request: serializeRequest({ ...updated.rows[0], is_upvoted_by_me: false }) });
  } finally {
    client.release();
  }
});

/** Verified business reps and admins can post progress updates and optionally change status. */
export const postRequestUpdate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  if (req.auth.role !== "business_rep" && req.auth.role !== "admin") {
    throw ApiError.forbidden("Only verified business representatives or admins can post updates");
  }

  const { id } = req.params;
  const body = updateSchema.parse(req.body);

  const requestExists = await pool.query("SELECT id FROM requests WHERE id = $1", [id]);
  if (requestExists.rows.length === 0) throw ApiError.notFound("Request not found");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updateResult = await client.query<RequestUpdateRow>(
      `INSERT INTO request_updates (request_id, posted_by, status, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.auth.userId, body.status ?? null, body.message],
    );

    if (body.status) {
      await client.query("UPDATE requests SET status = $1, updated_at = now() WHERE id = $2", [
        body.status,
        id,
      ]);
    }

    await client.query("COMMIT");
    res.status(201).json({ update: serializeUpdate(updateResult.rows[0]) });
  } finally {
    client.release();
  }
});

export const postComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const { id } = req.params;
  const body = commentSchema.parse(req.body);

  const requestExists = await pool.query("SELECT id FROM requests WHERE id = $1", [id]);
  if (requestExists.rows.length === 0) throw ApiError.notFound("Request not found");

  const result = await pool.query<CommentRow>(
    `INSERT INTO comments (request_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [id, req.auth.userId, body.content],
  );

  res.status(201).json({ comment: serializeComment(result.rows[0]) });
});
