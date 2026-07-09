import type { Request, Response } from "express";
import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import type { BusinessRequest } from "../types";

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
