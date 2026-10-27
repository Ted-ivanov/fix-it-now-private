// Integration tests against the fixit_test database, with Google's API replaced by a fake.
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
});

import { db } from "@/server/db";
import { booking, serviceCategory, team, teamCategory, teamMember } from "@/server/db/schema";
import { seed, truncateAll } from "@/server/db/seed-data";
import { createBooking } from "@/server/services/bookings";
import { sofiaInstant } from "@/server/services/time";
import { completeConnect, createConnectLink } from "./connect";
import { encrypt } from "./crypto";
import { eventId, syncBooking, syncMemberUpcoming } from "./sync";

const NOW = sofiaInstant("2026-10-01", 9 * 60);
const DAY = "2026-10-05"; // Monday

type Call = { method: string; url: string; body?: unknown };
let calls: Call[];
let tokenError: string | null;
let insertConflict: boolean;

function fakeGoogle() {
  calls = [];
  tokenError = null;
  insertConflict = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = String(input);
      const method = init.method ?? "GET";
      const body = typeof init.body === "string" && init.body.startsWith("{") ? JSON.parse(init.body) : init.body;
      calls.push({ method, url, body });
      if (url.startsWith("https://oauth2.googleapis.com/token")) {
        if (tokenError) return Response.json({ error: tokenError }, { status: 400 });
        const params = new URLSearchParams(String(init.body));
        if (params.get("grant_type") === "authorization_code") {
          const idToken = `x.${Buffer.from(JSON.stringify({ email: "ivan@gmail.com", email_verified: true })).toString("base64url")}.y`;
          return Response.json({
            access_token: "access",
            refresh_token: "refresh-new",
            id_token: idToken,
            scope: "openid email https://www.googleapis.com/auth/calendar.events",
          });
        }
        return Response.json({ access_token: "access" });
      }
      if (url.startsWith("https://oauth2.googleapis.com/revoke")) return new Response(null, { status: 200 });
      if (url.includes("/calendar/v3/")) {
        if (method === "POST" && insertConflict) return new Response("{}", { status: 409 });
        return new Response(method === "DELETE" ? null : "{}", { status: method === "DELETE" ? 204 : 200 });
      }
      throw new Error(`Unexpected fetch ${method} ${url}`);
    }),
  );
}

const calendarCalls = () => calls.filter((c) => c.url.includes("/calendar/v3/"));

async function teamFor(slugBg: string) {
  const [cat] = await db.select().from(serviceCategory).where(eq(serviceCategory.slugBg, slugBg));
  // Leave exactly one team on this category so the booking's team is predictable.
  const links = await db.select().from(teamCategory).where(eq(teamCategory.categoryId, cat.id));
  for (const l of links.slice(1)) await db.delete(teamCategory).where(eq(teamCategory.teamId, l.teamId));
  return { categoryId: cat.id, teamId: links[0].teamId };
}

async function book(categoryId: string, hour = 10) {
  return createBooking(
    db,
    {
      categoryId,
      visitType: "inspection",
      startAt: sofiaInstant(DAY, hour * 60).toISOString(),
      repairDisclaimerAccepted: false,
      locale: "bg",
      customerName: "Иван Петров",
      phone: "0888 123 456",
      email: "ivan@example.com",
      address: "ул. Витоша 1, София",
      description: "Искрящ контакт.",
      consent: true,
    },
    [],
    NOW,
  );
}

async function addMember(teamId: string, connected: boolean, extra: Partial<typeof teamMember.$inferInsert> = {}) {
  const [m] = await db
    .insert(teamMember)
    .values({
      teamId,
      name: "Иван",
      reminders: [
        { method: "popup", minutes: 1440 },
        { method: "email", minutes: 120 },
      ],
      googleRefreshToken: connected ? encrypt("refresh-old") : null,
      googleEmail: connected ? "ivan@gmail.com" : null,
      ...extra,
    })
    .returning();
  return m;
}

beforeEach(async () => {
  await truncateAll(db);
  await seed(db);
  fakeGoogle();
});

afterEach(() => vi.unstubAllGlobals());

describe("syncBooking", () => {
  it("adds the booking to connected members' calendars with their reminders", async () => {
    const { categoryId, teamId } = await teamFor("elektro");
    await addMember(teamId, true);
    await addMember(teamId, false, { name: "Без календар" });
    const created = await book(categoryId);

    await syncBooking(db, created.id);

    const inserts = calendarCalls();
    expect(inserts).toHaveLength(1); // only the connected member
    const event = inserts[0].body as { id: string; summary: string; start: { dateTime: string }; reminders: unknown };
    expect(inserts[0].method).toBe("POST");
    expect(event.id).toBe(eventId(created.id));
    expect(event.summary).toContain("Иван Петров");
    expect(event.start.dateTime).toBe(created.startAt.toISOString());
    expect(event.reminders).toEqual({
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 1440 },
        { method: "email", minutes: 120 },
      ],
    });
  });

  it("updates the existing event when Google already has it", async () => {
    const { categoryId, teamId } = await teamFor("elektro");
    await addMember(teamId, true);
    const created = await book(categoryId);
    insertConflict = true;

    await syncBooking(db, created.id);

    expect(calendarCalls().map((c) => c.method)).toEqual(["POST", "PUT"]);
    expect(calendarCalls()[1].url).toContain(`/events/${eventId(created.id)}`);
  });

  it("removes the event when the booking is cancelled", async () => {
    const { categoryId, teamId } = await teamFor("elektro");
    await addMember(teamId, true);
    const created = await book(categoryId);
    await db.update(booking).set({ status: "cancelled" }).where(eq(booking.id, created.id));

    await syncBooking(db, created.id);

    expect(calendarCalls()).toHaveLength(1);
    expect(calendarCalls()[0].method).toBe("DELETE");
    expect(calendarCalls()[0].url).toContain(`/events/${eventId(created.id)}`);
  });

  it("disconnects a member whose Google access was revoked", async () => {
    const { categoryId, teamId } = await teamFor("elektro");
    const member = await addMember(teamId, true);
    const created = await book(categoryId);
    tokenError = "invalid_grant";

    await syncBooking(db, created.id);

    const [after] = await db.select().from(teamMember).where(eq(teamMember.id, member.id));
    expect(after.googleRefreshToken).toBeNull();
    expect(after.googleError).toMatch(/Свържете календара отново/);
    expect(calendarCalls()).toHaveLength(0);
  });
});

describe("syncMemberUpcoming", () => {
  it("writes the team's upcoming bookings, not cancelled ones", async () => {
    const { categoryId, teamId } = await teamFor("elektro");
    const member = await addMember(teamId, true);
    const first = await book(categoryId, 10);
    const second = await book(categoryId, 14);
    await db.update(booking).set({ status: "cancelled" }).where(eq(booking.id, second.id));

    await syncMemberUpcoming(db, member.id, NOW);

    expect(calendarCalls().map((c) => (c.body as { id: string }).id)).toEqual([eventId(first.id)]);
  });
});

describe("connecting a calendar", () => {
  it("stores the token once, and the link cannot be reused", async () => {
    const [{ id: teamId }] = await db.select().from(team).limit(1);
    const member = await addMember(teamId, false);
    const link = await createConnectLink(db, member.id);
    const state = new URL(link).searchParams.get("t")!;

    const result = await completeConnect(db, state, "code-1");
    expect(result).toMatchObject({ ok: true, googleEmail: "ivan@gmail.com" });

    const [saved] = await db.select().from(teamMember).where(eq(teamMember.id, member.id));
    expect(saved.googleRefreshToken).toBeTruthy();
    expect(saved.googleRefreshToken).not.toContain("refresh-new"); // stored encrypted
    expect(saved.connectNonce).toBeNull();

    expect(await completeConnect(db, state, "code-2")).toEqual({ ok: false, reason: "link" });
  });

  it("refuses a different Google account than the one set in the admin", async () => {
    const [{ id: teamId }] = await db.select().from(team).limit(1);
    const member = await addMember(teamId, false, { email: "petar@gmail.com" });
    const state = new URL(await createConnectLink(db, member.id)).searchParams.get("t")!;

    const result = await completeConnect(db, state, "code");

    expect(result).toEqual({ ok: false, reason: "email-mismatch", expectedEmail: "petar@gmail.com" });
    expect(calls.some((c) => c.url.startsWith("https://oauth2.googleapis.com/revoke"))).toBe(true);
    const [saved] = await db.select().from(teamMember).where(eq(teamMember.id, member.id));
    expect(saved.googleRefreshToken).toBeNull();
  });
});
