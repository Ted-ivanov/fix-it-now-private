// Loads teams, jobs and rules from Postgres and hands them to the pure calculation.
import { and, eq, gt, inArray, lt, ne, or } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  booking,
  closedDay,
  serviceCategory,
  team,
  teamCategory,
  teamTimeOff,
  visitTypeConfig,
  workingHours,
} from "@/server/db/schema";
import {
  bookableRange,
  computeSlots,
  type SlotRules,
  type TeamAvailabilityInput,
} from "./availability-core";
import { getSettings } from "./settings";
import { addDays, parseDay, sofiaInstant } from "./time";

export type VisitType = "inspection" | "repair";

export class UnknownServiceError extends Error {
  constructor() {
    super("Unknown or inactive service category / visit type");
  }
}

export async function getRules(db: Db, categoryId: string, type: VisitType): Promise<SlotRules> {
  const [row] = await db
    .select({
      duration: visitTypeConfig.durationMinutes,
      categoryBuffer: serviceCategory.bufferMinutes,
      active: serviceCategory.active,
    })
    .from(visitTypeConfig)
    .innerJoin(serviceCategory, eq(serviceCategory.id, visitTypeConfig.categoryId))
    .where(and(eq(visitTypeConfig.categoryId, categoryId), eq(visitTypeConfig.type, type)));
  if (!row || !row.active) throw new UnknownServiceError();

  const s = await getSettings(db);
  return {
    durationMinutes: row.duration,
    bufferMinutes: row.categoryBuffer ?? s.travelBufferMinutes,
    slotStepMinutes: s.slotStepMinutes,
    minNoticeHours: s.minNoticeHours,
    bookingHorizonDays: s.bookingHorizonDays,
  };
}

/** Teams that serve the category, with their hours, jobs and time off between two days. */
async function loadTeams(
  db: Db,
  categoryId: string,
  fromDay: string,
  toDay: string,
): Promise<TeamAvailabilityInput[]> {
  const teams = await db
    .select({ id: team.id })
    .from(team)
    .innerJoin(teamCategory, eq(teamCategory.teamId, team.id))
    .where(and(eq(teamCategory.categoryId, categoryId), eq(team.active, true)));
  if (teams.length === 0) return [];
  const teamIds = teams.map((t) => t.id);

  // Pad by a day on each side so jobs and buffers crossing midnight are still seen.
  const from = sofiaInstant(addDays(fromDay, -1), 0);
  const to = sofiaInstant(addDays(toDay, 2), 0);

  const [hours, jobs, timeOff] = await Promise.all([
    db.select().from(workingHours),
    db
      .select({ teamId: booking.teamId, start: booking.startAt, end: booking.blockedUntil })
      .from(booking)
      .where(
        and(
          inArray(booking.teamId, teamIds),
          ne(booking.status, "cancelled"),
          lt(booking.startAt, to),
          gt(booking.blockedUntil, from),
        ),
      ),
    db
      .select({ teamId: teamTimeOff.teamId, start: teamTimeOff.startAt, end: teamTimeOff.endAt })
      .from(teamTimeOff)
      .where(
        and(
          inArray(teamTimeOff.teamId, teamIds),
          lt(teamTimeOff.startAt, to),
          gt(teamTimeOff.endAt, from),
        ),
      ),
  ]);

  const companyHours = hours.filter((h) => h.teamId === null);
  return teamIds.map((id) => {
    const own = hours.filter((h) => h.teamId === id);
    return {
      id,
      hours: own.length > 0 ? own : companyHours,
      jobs: jobs.filter((j) => j.teamId === id),
      timeOff: timeOff.filter((o) => o.teamId === id),
    };
  });
}

async function loadClosedDays(db: Db) {
  const rows = await db.select({ day: closedDay.day }).from(closedDay);
  return new Set(rows.map((r) => r.day));
}

export async function getSlots(
  db: Db,
  params: { categoryId: string; type: VisitType; day: string; now?: Date },
) {
  parseDay(params.day);
  const rules = await getRules(db, params.categoryId, params.type);
  const [teams, closedDays] = await Promise.all([
    loadTeams(db, params.categoryId, params.day, params.day),
    loadClosedDays(db),
  ]);
  return computeSlots({
    day: params.day,
    now: params.now ?? new Date(),
    rules,
    teams,
    closedDays,
  });
}

/** Days of a month ("YYYY-MM") that have at least one free slot. */
export async function getBookableDays(
  db: Db,
  params: { categoryId: string; type: VisitType; month: string; now?: Date },
): Promise<string[]> {
  const now = params.now ?? new Date();
  const first = `${params.month}-01`;
  parseDay(first);
  const rules = await getRules(db, params.categoryId, params.type);
  const range = bookableRange(now, rules);

  const days: string[] = [];
  for (let d = first; d.startsWith(params.month); d = addDays(d, 1)) {
    if (d >= range.first && d <= range.last) days.push(d);
  }
  if (days.length === 0) return [];

  const [teams, closedDays] = await Promise.all([
    loadTeams(db, params.categoryId, days[0], days.at(-1)!),
    loadClosedDays(db),
  ]);
  return days.filter(
    (day) => computeSlots({ day, now, rules, teams, closedDays }).length > 0,
  );
}

export async function getActiveCategories(db: Db) {
  return db
    .select()
    .from(serviceCategory)
    .where(eq(serviceCategory.active, true))
    .orderBy(serviceCategory.sort);
}

/** Finds an active category by its Bulgarian or English slug. */
export async function findCategoryBySlug(db: Db, slug: string) {
  const [row] = await db
    .select()
    .from(serviceCategory)
    .where(
      and(
        eq(serviceCategory.active, true),
        or(eq(serviceCategory.slugBg, slug), eq(serviceCategory.slugEn, slug)),
      ),
    );
  return row ?? null;
}
