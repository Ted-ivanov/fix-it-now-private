import { asc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { serviceCategory, visitTypeConfig } from "@/server/db/schema";

export type CategoryWithDurations = typeof serviceCategory.$inferSelect & {
  durations: { inspection: number | null; repair: number | null };
};

/** Active categories in display order, with how long each visit type takes. */
export async function getCatalog(db: Db): Promise<CategoryWithDurations[]> {
  const [categories, configs] = await Promise.all([
    db.select().from(serviceCategory).where(eq(serviceCategory.active, true)).orderBy(asc(serviceCategory.sort)),
    db.select().from(visitTypeConfig),
  ]);
  return categories.map((c) => {
    const own = configs.filter((v) => v.categoryId === c.id);
    return {
      ...c,
      durations: {
        inspection: own.find((v) => v.type === "inspection")?.durationMinutes ?? null,
        repair: own.find((v) => v.type === "repair")?.durationMinutes ?? null,
      },
    };
  });
}
