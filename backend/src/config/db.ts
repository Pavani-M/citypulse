import { Pool, types } from "pg";
import { env } from "./env";

// By default node-postgres parses DATE columns into a JS Date at local-timezone
// midnight, then callers serialize that to UTC ISO — shifting the date by the
// server's UTC offset (e.g. 2026-07-01 becomes 2026-06-30T18:30:00Z in IST).
// DATE has no timezone, so keep it as the raw 'YYYY-MM-DD' string instead.
types.setTypeParser(types.builtins.DATE, (val) => val);

// Managed Postgres providers (Neon, Render, Heroku, etc.) terminate SSL with
// certs that aren't in Node's default trust store — this is the standard,
// safe-enough way to connect to them without pinning a specific CA bundle.
const ssl = env.nodeEnv === "production" ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({ connectionString: env.databaseUrl, ssl });

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});
