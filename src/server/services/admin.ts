// Data access for the admin panel: bookings, teams, working hours and booking rules.
import { and, asc, eq, gte, inArray, isNull, lt, type SQL } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  booking,
  bookingPhoto,
  closedDay,
  serviceCategory,
  settings,
  team,
  teamCategory,
  teamTimeOff,
  visitTypeConfig,
  workingHours,
} from "@/server/db/schema";
import { presignDownload } from "@/server/storage";
import { addDays, sofiaInstant } from "./time";

// ---------------------------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------------------------

export type BookingStatus = (typeof booking.$inferSelect)["status"];

export async function listBookings(
  db: Db,
  filters: { from?: string; to?: string; status?: BookingStatus; categoryId?: string; teamId?: string },
) {
  const where: SQL[] = [];
  if (filters.from) where.push(gte(booking.startAt, sofiaInstant(filters.from, 0)));
  if (filters.to) where.push(lt(booking.startAt, sofiaInstant(addDays(filters.to, 1), 0)));
  if (filters.status) where.push(eq(booking.status, filters.status));
  if (filters.categoryId) where.push(eq(booking.categoryId, filters.categoryId));
  if (filters.teamId) where.push(eq(booking.teamId, filters.teamId));

  return db
    .select({
      booking,
      categoryName: serviceCategory.nameBg,
      categoryIcon: serviceCategory.icon,
      teamName: team.name,
    })
    .from(booking)
    .innerJoin(serviceCategory, eq(serviceCategory.id, booking.categoryId))
    .innerJoin(team, eq(team.id, booking.teamId))
    .where(and(...where))
    .orderBy(asc(booking.startAt))
    .limit(500);
}

export async function getBookingDetail(db: Db, id: string) {
  const [row] = await db
    .select({ booking, categoryName: serviceCategory.nameBg, teamName: team.name })
    .from(booking)
    .innerJoin(serviceCategory, eq(serviceCategory.id, booking.categoryId))
    .innerJoin(team, eq(team.id, booking.teamId))
    .where(eq(booking.id, id));
  if (!row) return null;
  const photos = await db.select().from(bookingPhoto).where(eq(bookingPhoto.bookingId, id));
  const photoUrls = await Promise.all(photos.map(async (p) => ({ ...p, url: await presignDownload(p.storageKey) })));
  return { ...row, photos: photoUrls };
}

export async function setBookingStatus(db: Db, id: string, status: BookingStatus) {
  const [updated] = await db.update(booking).set({ status }).where(eq(booking.id, id)).returning();
  return updated;
}

export async function setBookingNote(db: Db, id: string, adminNote: string | null) {
  await db.update(booking).set({ adminNote }).where(eq(booking.id, id));
}

export async function countBookings(db: Db, from: Date, to: Date) {
  const rows = await db
    .select({ status: booking.status })
    .from(booking)
    .where(and(gte(booking.startAt, from), lt(booking.startAt, to)));
  return {
    total: rows.filter((r) => r.status !== "cancelled").length,
    pending: rows.filter((r) => r.status === "pending").length,
  };
}

// ---------------------------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------------------------

export async function listTeams(db: Db) {
  const [teams, links, hours, offs] = await Promise.all([
    db.select().from(team).orderBy(asc(team.name)),
    db.select().from(teamCategory),
    db.select().from(workingHours),
    db
      .select()
      .from(teamTimeOff)
      .where(gte(teamTimeOff.endAt, new Date()))
      .orderBy(asc(teamTimeOff.startAt)),
  ]);
  return teams.map((t) => ({
    ...t,
    categoryIds: links.filter((l) => l.teamId === t.id).map((l) => l.categoryId),
    hours: hours.filter((h) => h.teamId === t.id),
    timeOff: offs.filter((o) => o.teamId === t.id),
  }));
}

export async function createTeam(db: Db, name: string, categoryIds: string[]) {
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(team).values({ name }).returning();
    if (categoryIds.length > 0) {
      await tx.insert(teamCategory).values(categoryIds.map((categoryId) => ({ teamId: created.id, categoryId })));
    }
    return created;
  });
}

export async function updateTeam(db: Db, id: string, input: { name: string; active: boolean; categoryIds: string[] }) {
  await db.transaction(async (tx) => {
    await tx.update(team).set({ name: input.name, active: input.active }).where(eq(team.id, id));
    await tx.delete(teamCategory).where(eq(teamCategory.teamId, id));
    if (input.categoryIds.length > 0) {
      await tx.insert(teamCategory).values(input.categoryIds.map((categoryId) => ({ teamId: id, categoryId })));
    }
  });
}

export async function deleteTeam(db: Db, id: string) {
  // Teams with bookings are kept for history; deactivate them instead.
  const [used] = await db.select({ id: booking.id }).from(booking).where(eq(booking.teamId, id)).limit(1);
  if (used) {
    await db.update(team).set({ active: false }).where(eq(team.id, id));
    return { deleted: false };
  }
  await db.delete(team).where(eq(team.id, id));
  return { deleted: true };
}

export type HoursRow = { weekday: number; openMinute: number; closeMinute: number };

/** Replaces the weekly hours of a team (or the company default when teamId is null). */
export async function setWorkingHours(db: Db, teamId: string | null, rows: HoursRow[]) {
  await db.transaction(async (tx) => {
    await tx.delete(workingHours).where(teamId ? eq(workingHours.teamId, teamId) : isNull(workingHours.teamId));
    if (rows.length > 0) await tx.insert(workingHours).values(rows.map((r) => ({ ...r, teamId })));
  });
}

export async function getCompanyHours(db: Db) {
  return db.select().from(workingHours).where(isNull(workingHours.teamId)).orderBy(asc(workingHours.weekday));
}

export async function addTimeOff(db: Db, input: { teamId: string; startAt: Date; endAt: Date; reason: string | null }) {
  await db.insert(teamTimeOff).values(input);
}

export async function deleteTimeOff(db: Db, id: string) {
  await db.delete(teamTimeOff).where(eq(teamTimeOff.id, id));
}

// ---------------------------------------------------------------------------------------------
// Rules: settings, categories, durations, closed days
// ---------------------------------------------------------------------------------------------

export async function updateSettings(
  db: Db,
  input: Pick<
    typeof settings.$inferInsert,
    "travelBufferMinutes" | "slotStepMinutes" | "bookingHorizonDays" | "minNoticeHours" | "notificationEmail"
  >,
) {
  await db
    .insert(settings)
    .values({ id: 1, ...input })
    .onConflictDoUpdate({ target: settings.id, set: input });
}

export async function listCategoriesWithDurations(db: Db) {
  const [categories, configs] = await Promise.all([
    db.select().from(serviceCategory).orderBy(asc(serviceCategory.sort)),
    db.select().from(visitTypeConfig),
  ]);
  return categories.map((c) => ({
    ...c,
    inspectionMinutes: configs.find((v) => v.categoryId === c.id && v.type === "inspection")?.durationMinutes ?? 60,
    repairMinutes: configs.find((v) => v.categoryId === c.id && v.type === "repair")?.durationMinutes ?? 120,
  }));
}

export async function updateCategory(
  db: Db,
  id: string,
  input: {
    nameBg: string;
    nameEn: string | null;
    descriptionBg: string | null;
    descriptionEn: string | null;
    icon: string;
    active: boolean;
    bufferMinutes: number | null;
    inspectionMinutes: number;
    repairMinutes: number;
  },
) {
  const { inspectionMinutes, repairMinutes, ...fields } = input;
  await db.transaction(async (tx) => {
    await tx.update(serviceCategory).set(fields).where(eq(serviceCategory.id, id));
    for (const [type, durationMinutes] of [
      ["inspection", inspectionMinutes],
      ["repair", repairMinutes],
    ] as const) {
      await tx
        .insert(visitTypeConfig)
        .values({ categoryId: id, type, durationMinutes })
        .onConflictDoUpdate({
          target: [visitTypeConfig.categoryId, visitTypeConfig.type],
          set: { durationMinutes },
        });
    }
  });
}

export async function listClosedDays(db: Db) {
  const today = new Date().toISOString().slice(0, 10);
  return db.select().from(closedDay).where(gte(closedDay.day, today)).orderBy(asc(closedDay.day));
}

export async function addClosedDay(db: Db, day: string, note: string | null) {
  await db.insert(closedDay).values({ day, note }).onConflictDoUpdate({ target: closedDay.day, set: { note } });
}

export async function deleteClosedDay(db: Db, day: string) {
  await db.delete(closedDay).where(eq(closedDay.day, day));
}

export async function bookingsForTeams(db: Db, day: string) {
  return db
    .select({ booking, categoryName: serviceCategory.nameBg, categoryIcon: serviceCategory.icon })
    .from(booking)
    .innerJoin(serviceCategory, eq(serviceCategory.id, booking.categoryId))
    .where(
      and(
        gte(booking.startAt, sofiaInstant(day, 0)),
        lt(booking.startAt, sofiaInstant(addDays(day, 1), 0)),
        inArray(booking.status, ["pending", "confirmed", "done"]),
      ),
    )
    .orderBy(asc(booking.startAt));
}
