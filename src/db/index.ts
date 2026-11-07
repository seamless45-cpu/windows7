import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool(
    databaseUrl
      ? { connectionString: databaseUrl }
      : // The desktop simulation does not need a database. Fall back to a
        // local, never-connected pool so builds and `/api/health` work
        // without DATABASE_URL configured.
        { connectionString: "postgres://localhost:5432/postgres", max: 0, connectionTimeoutMillis: 2000 }
  );

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
