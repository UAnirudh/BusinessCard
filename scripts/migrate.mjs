#!/usr/bin/env node
// Applies generated Drizzle migrations to the Postgres database in DATABASE_URL.
// Used by `npm run db:migrate` and by `vercel-build`.
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error(
    "\n[migrate] DATABASE_URL is not set.\n" +
      "Set it to your Postgres connection string, then run `npm run db:migrate` again.\n" +
      "Locally the app uses an embedded PGlite database, so migrations run automatically.\n",
  );
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  max: 1,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
});
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("[migrate] Database is up to date.");
} catch (error) {
  console.error("[migrate] Failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
