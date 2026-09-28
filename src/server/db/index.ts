import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb(url: string) {
  const client = postgres(url, { max: 10 });
  return drizzle(client, { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: Db };

function getUrl() {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  // `next build` imports this module without secrets; postgres.js only connects on first query.
  if (process.env.NEXT_PHASE === "phase-production-build") return "postgres://build@localhost:5432/build";
  throw new Error("DATABASE_URL is not set");
}

export const db: Db = globalForDb.db ?? createDb(getUrl());
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export { schema };
