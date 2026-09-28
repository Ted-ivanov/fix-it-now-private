import { TZDate } from "@date-fns/tz";

export const TIME_ZONE = "Europe/Sofia";

/** "2026-10-05" → { y, m, d }. Throws on anything that is not a real calendar date. */
export function parseDay(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new Error(`Invalid day: ${day}`);
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) throw new Error(`Invalid day: ${day}`);
  return { y, m, d };
}

/** The instant at `minute` minutes after local midnight in Sofia on `day` (DST-safe). */
export function sofiaInstant(day: string, minute: number): Date {
  const { y, m, d } = parseDay(day);
  return new Date(new TZDate(y, m - 1, d, Math.floor(minute / 60), minute % 60, TIME_ZONE).getTime());
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a calendar day. */
export function isoWeekday(day: string): number {
  const { y, m, d } = parseDay(day);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return js === 0 ? 7 : js;
}

/** Calendar day in Sofia ("YYYY-MM-DD") for an instant. */
export function sofiaDay(instant: Date): string {
  const t = new TZDate(instant.getTime(), TIME_ZONE);
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${mm}-${dd}`;
}

/** "HH:mm" in Sofia for an instant. */
export function sofiaTime(instant: Date): string {
  const t = new TZDate(instant.getTime(), TIME_ZONE);
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

export function addDays(day: string, days: number): string {
  const { y, m, d } = parseDay(day);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}
