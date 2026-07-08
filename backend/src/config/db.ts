import { Pool } from "pg";
import { env } from "./env";

// Managed Postgres providers (Neon, Render, Heroku, etc.) terminate SSL with
// certs that aren't in Node's default trust store — this is the standard,
// safe-enough way to connect to them without pinning a specific CA bundle.
const ssl = env.nodeEnv === "production" ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({ connectionString: env.databaseUrl, ssl });

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});
