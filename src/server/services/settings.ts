import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { settings } from "@/server/db/schema";

export type Settings = typeof settings.$inferSelect;

export const DEFAULT_SETTINGS: Omit<Settings, "createdAt" | "updatedAt"> = {
  id: 1,
  travelBufferMinutes: 30,
  slotStepMinutes: 30,
  bookingHorizonDays: 30,
  minNoticeHours: 12,
  notificationEmail: null,
};

export async function getSettings(db: Db): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  const [created] = await db.insert(settings).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(settings).where(eq(settings.id, 1)))[0];
}
