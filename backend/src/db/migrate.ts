import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const ssl = process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          SERIAL PRIMARY KEY,
        filename    TEXT NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const applied = new Set(
      (await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations")).rows.map(
        (r) => r.filename,
      ),
    );

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let ranCount = 0;

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Applied migration: ${file}`);
        ranCount += 1;
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration failed (${file}): ${(err as Error).message}`);
      } finally {
        client.release();
      }
    }

    console.log(ranCount === 0 ? "No new migrations to apply." : `Applied ${ranCount} migration(s).`);
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
