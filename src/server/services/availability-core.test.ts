import { describe, expect, it } from "vitest";
import { computeSlots, type SlotRules, type TeamAvailabilityInput } from "./availability-core";
import { sofiaInstant, sofiaTime } from "./time";

// Monday 5 October 2026. Sofia is on summer time (UTC+3) until 25 October.
const DAY = "2026-10-05";
const NOW = sofiaInstant("2026-10-01", 9 * 60);

const weekdays8to18 = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  openMinute: 8 * 60,
  closeMinute: 18 * 60,
}));

const rules: SlotRules = {
  durationMinutes: 60,
  bufferMinutes: 30,
  slotStepMinutes: 30,
  minNoticeHours: 12,
  bookingHorizonDays: 30,
};

function team(id: string, extra: Partial<TeamAvailabilityInput> = {}): TeamAvailabilityInput {
  return { id, hours: weekdays8to18, jobs: [], timeOff: [], ...extra };
}

function times(slots: ReturnType<typeof computeSlots>) {
  return slots.map((s) => sofiaTime(s.start));
}

const at = (hhmm: string, day = DAY) => {
  const [h, m] = hhmm.split(":").map(Number);
  return sofiaInstant(day, h * 60 + m);
};

describe("computeSlots", () => {
  it("offers every step within working hours where the whole job fits", () => {
    const slots = computeSlots({ day: DAY, now: NOW, rules, teams: [team("a")], closedDays: new Set() });
    expect(times(slots)[0]).toBe("08:00");
    // Last start is 17:00 so a 60-minute job ends at closing time (buffer may run past it).
    expect(times(slots).at(-1)).toBe("17:00");
    expect(slots).toHaveLength(19);
  });

  it("uses Sofia local time, including after the switch to winter time", () => {
    const winterDay = "2026-10-26"; // first Monday after DST ends (UTC+2)
    const slots = computeSlots({
      day: winterDay,
      now: NOW,
      rules,
      teams: [team("a")],
      closedDays: new Set(),
    });
    expect(slots[0].start.toISOString()).toBe("2026-10-26T06:00:00.000Z");
  });

  it("returns nothing on weekends without hours, closed days, past days and beyond the horizon", () => {
    const base = { now: NOW, rules, teams: [team("a")], closedDays: new Set([DAY]) };
    expect(computeSlots({ ...base, day: "2026-10-04" })).toEqual([]); // Sunday
    expect(computeSlots({ ...base, day: DAY })).toEqual([]); // closed
    expect(computeSlots({ ...base, day: "2026-09-30" })).toEqual([]); // past
    expect(computeSlots({ ...base, day: "2026-11-02" })).toEqual([]); // > 30 days
  });

  it("respects the minimum notice", () => {
    const now = at("20:00", "2026-10-04"); // Sunday evening, 12h notice → Monday 08:00
    const slots = computeSlots({ day: DAY, now, rules, teams: [team("a")], closedDays: new Set() });
    expect(times(slots)[0]).toBe("08:00");

    const later = at("21:15", "2026-10-04"); // → earliest 09:15, so first step is 09:30
    const slots2 = computeSlots({ day: DAY, now: later, rules, teams: [team("a")], closedDays: new Set() });
    expect(times(slots2)[0]).toBe("09:30");
  });

  it("keeps the travel buffer before and after an existing job", () => {
    // Existing job 11:00–12:00, blocked until 12:30 (its own buffer).
    const existing = { start: at("11:00"), end: at("12:30") };
    const slots = computeSlots({
      day: DAY,
      now: NOW,
      rules,
      teams: [team("a", { jobs: [existing] })],
      closedDays: new Set(),
    });
    const t = times(slots);
    // 09:30 → job ends 10:30 + 30 min buffer = 11:00: just fits.
    expect(t).toContain("09:30");
    // 10:00 → would still be travelling at 11:00.
    expect(t).not.toContain("10:00");
    expect(t).not.toContain("11:00");
    expect(t).not.toContain("12:00");
    // 12:30 is the first start after the existing job's buffer.
    expect(t).toContain("12:30");
  });

  it("skips time off", () => {
    const off = { start: at("13:00"), end: at("15:00") };
    const slots = computeSlots({
      day: DAY,
      now: NOW,
      rules,
      teams: [team("a", { timeOff: [off] })],
      closedDays: new Set(),
    });
    const t = times(slots);
    expect(t).toContain("12:00");
    expect(t).not.toContain("12:30");
    expect(t).not.toContain("14:30");
    expect(t).toContain("15:00");
  });

  it("offers a slot while at least one team is free and lists the least busy team first", () => {
    const busyA = [{ start: at("08:00"), end: at("09:30") }, { start: at("15:00"), end: at("16:30") }];
    const busyB = [{ start: at("08:00"), end: at("09:30") }];
    const slots = computeSlots({
      day: DAY,
      now: NOW,
      rules,
      teams: [team("a", { jobs: busyA }), team("b", { jobs: busyB })],
      closedDays: new Set(),
    });
    const t = times(slots);
    expect(t).not.toContain("08:00"); // both teams busy
    const ten = slots.find((s) => sofiaTime(s.start) === "10:00")!;
    expect(ten.freeTeamIds).toEqual(["b", "a"]); // b has 1 job that day, a has 2
    const fifteen = slots.find((s) => sofiaTime(s.start) === "15:00")!;
    expect(fifteen.freeTeamIds).toEqual(["b"]);
  });

  it("uses each team's own working hours", () => {
    const early = team("early", {
      hours: [{ weekday: 1, openMinute: 7 * 60, closeMinute: 12 * 60 }],
    });
    const slots = computeSlots({ day: DAY, now: NOW, rules, teams: [early, team("b")], closedDays: new Set() });
    expect(times(slots)[0]).toBe("07:00");
    expect(slots.find((s) => sofiaTime(s.start) === "07:00")!.freeTeamIds).toEqual(["early"]);
    expect(slots.find((s) => sofiaTime(s.start) === "13:00")!.freeTeamIds).toEqual(["b"]);
  });

  it("returns nothing when there are no teams", () => {
    expect(computeSlots({ day: DAY, now: NOW, rules, teams: [], closedDays: new Set() })).toEqual([]);
  });
});
