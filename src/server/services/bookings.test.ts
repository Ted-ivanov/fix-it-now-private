// Integration tests: run against the real fixit_test Postgres database (docker compose up -d).
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { booking, serviceCategory, teamCategory, team } from "@/server/db/schema";
import { seed, truncateAll } from "@/server/db/seed-data";
import type { BookingRequest } from "@/lib/booking-schema";
import { getBookableDays, getSlots } from "./availability";
import { cancelBookingByToken, createBooking, DisclaimerRequiredError, SlotTakenError } from "./bookings";
import { sofiaInstant, sofiaTime } from "./time";

const NOW = sofiaInstant("2026-10-01", 9 * 60);
const DAY = "2026-10-05"; // Monday

async function category(slugBg: string) {
  const [row] = await db.select().from(serviceCategory).where(eq(serviceCategory.slugBg, slugBg));
  return row;
}

function request(categoryId: string, hhmm: string, extra: Partial<BookingRequest> = {}): BookingRequest {
  const [h, m] = hhmm.split(":").map(Number);
  return {
    categoryId,
    visitType: "inspection",
    startAt: sofiaInstant(DAY, h * 60 + m).toISOString(),
    repairDisclaimerAccepted: false,
    locale: "bg",
    customerName: "Иван Петров",
    phone: "0888 123 456",
    email: "Ivan@Example.com",
    address: "ул. Витоша 1, София",
    description: "Искрящ контакт в кухнята.",
    consent: true,
    ...extra,
  };
}

beforeEach(async () => {
  await truncateAll(db);
  await seed(db);
});

describe("createBooking", () => {
  it("books a free slot, normalises contact details and removes the slot", async () => {
    const elektro = await category("elektro"); // served only by "Екип 1"
    const created = await createBooking(db, request(elektro.id, "10:00"), [], NOW);

    expect(created.ref).toMatch(/^FN-[2-9A-Z]{6}$/);
    expect(created.phone).toBe("+359888123456");
    expect(created.email).toBe("ivan@example.com");
    expect(created.blockedUntil.getTime() - created.endAt.getTime()).toBe(30 * 60_000);

    const slots = await getSlots(db, { categoryId: elektro.id, type: "inspection", day: DAY, now: NOW });
    const t = slots.map((s) => sofiaTime(s.start));
    expect(t).not.toContain("10:00");
    expect(t).not.toContain("09:30"); // would run into the 10:00 job without travel time
    expect(t).toContain("11:30"); // 10:00 + 60 min + 30 min buffer
  });

  it("refuses a time that is not an offered slot", async () => {
    const elektro = await category("elektro");
    await expect(createBooking(db, request(elektro.id, "10:10"), [], NOW)).rejects.toBeInstanceOf(
      SlotTakenError,
    );
  });

  it("requires the extra-charge notice for repair visits", async () => {
    const elektro = await category("elektro");
    await expect(
      createBooking(db, request(elektro.id, "10:00", { visitType: "repair" }), [], NOW),
    ).rejects.toBeInstanceOf(DisclaimerRequiredError);

    const ok = await createBooking(
      db,
      request(elektro.id, "10:00", { visitType: "repair", repairDisclaimerAccepted: true }),
      [],
      NOW,
    );
    expect(ok.repairDisclaimerAcceptedAt).not.toBeNull();
    expect(ok.endAt.getTime() - ok.startAt.getTime()).toBe(120 * 60_000);
  });

  it("spreads jobs across teams and closes the slot when every team is taken", async () => {
    const drugi = await category("drugi"); // served by both teams
    const first = await createBooking(db, request(drugi.id, "10:00"), [], NOW);
    const second = await createBooking(db, request(drugi.id, "10:00"), [], NOW);
    expect(second.teamId).not.toBe(first.teamId);
    await expect(createBooking(db, request(drugi.id, "10:00"), [], NOW)).rejects.toBeInstanceOf(
      SlotTakenError,
    );
  });

  it("lets exactly one of two simultaneous requests win the last free team", async () => {
    const elektro = await category("elektro");
    const results = await Promise.allSettled([
      createBooking(db, request(elektro.id, "14:00"), [], NOW),
      createBooking(db, request(elektro.id, "14:00"), [], NOW),
      createBooking(db, request(elektro.id, "14:30"), [], NOW),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);
    for (const r of rejected) expect((r as PromiseRejectedResult).reason).toBeInstanceOf(SlotTakenError);
  });

  it("database constraint rejects overlapping jobs for one team even without the app check", async () => {
    const elektro = await category("elektro");
    const created = await createBooking(db, request(elektro.id, "10:00"), [], NOW);
    const { id: _id, ref: _ref, cancelToken: _t, createdAt: _c, updatedAt: _u, ...copy } = created;
    await expect(
      db.insert(booking).values({ ...copy, ref: "FN-DUPLIC", cancelToken: "x".repeat(32) }),
    ).rejects.toThrow();
  });
});

describe("availability", () => {
  it("lists bookable days in a month and hides a team's categories when it is inactive", async () => {
    const vik = await category("vik");
    const days = await getBookableDays(db, { categoryId: vik.id, type: "inspection", month: "2026-10", now: NOW });
    expect(days[0]).toBe("2026-10-02"); // 12h notice from 09:00 leaves nothing today
    expect(days).toContain("2026-10-03"); // Saturday has hours
    expect(days).not.toContain("2026-10-04"); // Sunday closed

    // Deactivate the only plumbing team: no days left.
    const [links] = await db.select().from(teamCategory).where(eq(teamCategory.categoryId, vik.id));
    await db.update(team).set({ active: false }).where(eq(team.id, links.teamId));
    expect(
      await getBookableDays(db, { categoryId: vik.id, type: "inspection", month: "2026-10", now: NOW }),
    ).toEqual([]);
  });
});

describe("cancelBookingByToken", () => {
  it("cancels a future booking and frees the slot", async () => {
    const elektro = await category("elektro");
    const created = await createBooking(db, request(elektro.id, "10:00"), [], NOW);
    const result = await cancelBookingByToken(db, created.cancelToken, NOW);
    expect(result.status).toBe("cancelled");
    expect((await cancelBookingByToken(db, created.cancelToken, NOW)).status).toBe("already-cancelled");
    expect((await cancelBookingByToken(db, "nope", NOW)).status).toBe("not-found");

    const again = await createBooking(db, request(elektro.id, "10:00"), [], NOW);
    expect(again.id).not.toBe(created.id);
  });
});
