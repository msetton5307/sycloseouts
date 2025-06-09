import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use the standard pg driver when connecting to a local database to avoid
// attempting a websocket connection, which fails with ECONNREFUSED.
let pool: PgPool | NeonPool;
let db: ReturnType<typeof drizzlePg> | ReturnType<typeof drizzleNeon>;

if (/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)) {
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg(pool, { schema });
} else {
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon(pool, { schema });
}

export { pool, db };
