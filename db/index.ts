import fs from "node:fs/promises";
import path from "node:path";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * The query builder API is identical for both drivers; PGlite is only used for
 * local development so its instance is cast to the Postgres database type.
 */
export type Database = NodePgDatabase<typeof schema>;

type DbGlobal = {
  promise?: Promise<Database>;
  pool?: Pool;
};

const globalForDb = globalThis as unknown as { __tappdDb?: DbGlobal };

export function databaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    undefined
  );
}

async function createLocalDatabase(): Promise<Database> {
  // Imported lazily so the production bundle never loads the WASM engine.
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  await fs.mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema }) as unknown as Database;
  await migratePglite(db as never, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  return db;
}

function createPostgresDatabase(url: string): Database {
  const host = new URL(url).hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    // Validate remote PostgreSQL certificates; disabling this allows an on-path
    // attacker to impersonate the database and read or alter user data.
    ssl: isLocal ? undefined : { rejectUnauthorized: true },
  });
  pool.on("error", (err) => console.error("[db] idle client error", err.message));
  const db = drizzlePg(pool, { schema });
  globalForDb.__tappdDb = { ...globalForDb.__tappdDb, pool };
  return db;
}

let cached: Database | undefined;

/** Returns the shared database client, initializing it once per process. */
export async function getDb(): Promise<Database> {
  if (cached) return cached;
  if (globalForDb.__tappdDb?.promise) {
    cached = await globalForDb.__tappdDb.promise;
    return cached;
  }

  const url = databaseUrl();
  const promise = (async () => {
    if (url) return createPostgresDatabase(url);
    if (process.env.NODE_ENV === "production" && !process.env.TAPPD_ALLOW_EMBEDDED_DB) {
      throw new Error(
        "No database configured. Set DATABASE_URL to a Postgres connection string " +
          "(Vercel Postgres, Neon, Supabase, or any Postgres) before running in production.",
      );
    }
    return createLocalDatabase();
  })();

  globalForDb.__tappdDb = { ...globalForDb.__tappdDb, promise };
  try {
    cached = await promise;
    return cached;
  } catch (error) {
    globalForDb.__tappdDb = { ...globalForDb.__tappdDb, promise: undefined };
    throw error;
  }
}
