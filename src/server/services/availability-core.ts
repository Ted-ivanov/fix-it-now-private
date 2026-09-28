// Pure slot calculation: no database, no clock. Everything it needs is passed in, which keeps
// the rules easy to test. See availability.ts for the part that loads data from Postgres.
import { addDays, addMinutes, isoWeekday, sofiaDay, sofiaInstant } from "./time";

export type Interval = { start: Date; end: Date };

export type OpeningHours = { weekday: number; openMinute: number; closeMinute: number };

export type TeamAvailabilityInput = {
  id: string;
  /** This team's weekly hours (already resolved: own rows, or the company default). */
  hours: OpeningHours[];
  /** Existing jobs, as [start, blocked_until): the job plus its travel buffer. */
  jobs: Interval[];
  /** Time off. */
  timeOff: Interval[];
};

export type SlotRules = {
  durationMinutes: number;
  bufferMinutes: number;
  slotStepMinutes: number;
  minNoticeHours: number;
  bookingHorizonDays: number;
};

export type Slot = {
  start: Date;
  end: Date;
  /** Teams that can take this job, least busy that day first. */
  freeTeamIds: string[];
};

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** First and last day customers may book, given "now". */
export function bookableRange(now: Date, rules: Pick<SlotRules, "bookingHorizonDays">) {
  const first = sofiaDay(now);
  return { first, last: addDays(first, rules.bookingHorizonDays) };
}

export function computeSlots(params: {
  day: string;
  now: Date;
  rules: SlotRules;
  teams: TeamAvailabilityInput[];
  closedDays: ReadonlySet<string>;
}): Slot[] {
  const { day, now, rules, teams, closedDays } = params;
  const { first, last } = bookableRange(now, rules);
  if (day < first || day > last || closedDays.has(day)) return [];

  const weekday = isoWeekday(day);
  const earliest = addMinutes(now, rules.minNoticeHours * 60);
  const step = Math.max(5, rules.slotStepMinutes);

  // How many jobs each team already has that day, used to spread the work evenly.
  const dayStart = sofiaInstant(day, 0);
  const dayEnd = sofiaInstant(addDays(day, 1), 0);
  const load = new Map(
    teams.map((t) => [
      t.id,
      t.jobs.filter((j) => overlaps(j, { start: dayStart, end: dayEnd })).length,
    ]),
  );

  const byStart = new Map<number, Slot>();

  for (const team of teams) {
    for (const hours of team.hours.filter((h) => h.weekday === weekday)) {
      for (
        let minute = hours.openMinute;
        minute + rules.durationMinutes <= hours.closeMinute;
        minute += step
      ) {
        const start = sofiaInstant(day, minute);
        if (start < earliest) continue;

        const end = addMinutes(start, rules.durationMinutes);
        // The job plus the travel buffer after it must not touch another job's blocked time.
        // Existing jobs already include their own buffer, so the gap holds in both directions.
        const blocked: Interval = { start, end: addMinutes(end, rules.bufferMinutes) };
        if (team.jobs.some((j) => overlaps(j, blocked))) continue;
        if (team.timeOff.some((off) => overlaps(off, { start, end }))) continue;

        const key = start.getTime();
        const slot = byStart.get(key) ?? { start, end, freeTeamIds: [] };
        slot.freeTeamIds.push(team.id);
        byStart.set(key, slot);
      }
    }
  }

  return [...byStart.values()]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((slot) => ({
      ...slot,
      freeTeamIds: [...slot.freeTeamIds].sort(
        (a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0) || a.localeCompare(b),
      ),
    }));
}
