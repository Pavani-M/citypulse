import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { comparePassword, hashPassword, signToken, toPublicUser } from "../services/auth.service";
import type { User } from "../types";

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  // Admin accounts are never self-registered — seed/promote them directly in the database.
  role: z.enum(["user", "business_rep"]).optional().default("user"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [body.email]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await hashPassword(body.password);
  const result = await pool.query<User>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [body.name, body.email, passwordHash, body.role],
  );
  const user = result.rows[0];

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const result = await pool.query<User>("SELECT * FROM users WHERE email = $1", [body.email]);
  const user = result.rows[0];
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const valid = await comparePassword(body.password, user.password_hash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  const token = signToken({ userId: user.id, role: user.role });
  res.json({ token, user: toPublicUser(user) });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();

  const result = await pool.query<User>("SELECT * FROM users WHERE id = $1", [req.auth.userId]);
  const user = result.rows[0];
  if (!user) throw ApiError.notFound("User not found");

  res.json({ user: toPublicUser(user) });
});
