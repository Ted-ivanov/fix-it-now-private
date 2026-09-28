import { sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { rateLimit } from "@/server/db/schema";

/**
 * Fixed-window limiter stored in Postgres, so it works across serverless instances.
 * Returns true when the request is allowed.
 */
export async function checkRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<boolean> {
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const [row] = await db
    .insert(rateLimit)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        // Raw sql`` values skip Drizzle's column mapping, so the Date is passed as ISO text.
        count: sql`CASE WHEN ${rateLimit.windowStart} = ${windowStart.toISOString()}::timestamptz THEN ${rateLimit.count} + 1 ELSE 1 END`,
        windowStart,
      },
    })
    .returning({ count: rateLimit.count });
  return row.count <= limit;
}
