// Writes bookings into the Google Calendars of the assigned team's members (one-way).
import { and, eq, gt, isNotNull, ne } from "drizzle-orm";
import type { Db } from "@/server/db";
import { booking, serviceCategory, teamMember } from "@/server/db/schema";
import { env } from "@/server/env";
import { formatPhone } from "@/lib/site";
import { TIME_ZONE } from "@/server/services/time";
import { accessToken, deleteEvent, GoogleAuthRevokedError, googleConfigured, upsertEvent, type GoogleEvent } from "./client";
import { decrypt } from "./crypto";

type Member = typeof teamMember.$inferSelect;
type BookingRow = { booking: typeof booking.$inferSelect; categoryName: string };

const VISIT_TYPES = { inspection: "Оглед и оферта", repair: "Ремонт" } as const;

/** Google event ids allow a–v and 0–9, so a UUID without dashes works and stays stable. */
export function eventId(bookingId: string) {
  return bookingId.replace(/-/g, "");
}

export function memberEvent(row: BookingRow, member: Pick<Member, "reminders">): GoogleEvent {
  const b = row.booking;
  const adminUrl = `${env.SITE_URL}/admin/bookings/${b.id}`;
  return {
    id: eventId(b.id),
    summary: `${row.categoryName} · ${VISIT_TYPES[b.visitType]} – ${b.customerName}`,
    location: b.address,
    description: [
      `Резервация: ${b.ref}`,
      `Клиент: ${b.customerName}`,
      `Телефон: ${formatPhone(b.phone)}`,
      `Имейл: ${b.email}`,
      "",
      "Описание:",
      b.description,
      "",
      `В администрацията: ${adminUrl}`,
    ].join("\n"),
    start: { dateTime: b.startAt.toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: b.endAt.toISOString(), timeZone: TIME_ZONE },
    reminders: { useDefault: false, overrides: member.reminders.slice(0, 5) },
    source: { title: "Fix It Now", url: adminUrl },
  };
}

/** Runs `fn` with a fresh access token. A revoked connection is cleared and shown in the admin. */
async function withToken(db: Db, member: Member, fn: (token: string) => Promise<void>) {
  if (!member.googleRefreshToken) return;
  try {
    await fn(await accessToken(decrypt(member.googleRefreshToken)));
    if (member.googleError) await db.update(teamMember).set({ googleError: null }).where(eq(teamMember.id, member.id));
  } catch (error) {
    if (error instanceof GoogleAuthRevokedError) {
      await db
        .update(teamMember)
        .set({ googleRefreshToken: null, googleError: "Достъпът до Google Calendar е спрян. Свържете календара отново." })
        .where(eq(teamMember.id, member.id));
    } else {
      await db
        .update(teamMember)
        .set({ googleError: "Последното записване в Google Calendar не успя." })
        .where(eq(teamMember.id, member.id));
    }
    console.error(`[google] member ${member.id}`, error);
  }
}

function connectedMembers(db: Db, teamId: string) {
  return db
    .select()
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), isNotNull(teamMember.googleRefreshToken)));
}

async function loadBooking(db: Db, bookingId: string): Promise<BookingRow | undefined> {
  const [row] = await db
    .select({ booking, categoryName: serviceCategory.nameBg })
    .from(booking)
    .innerJoin(serviceCategory, eq(serviceCategory.id, booking.categoryId))
    .where(eq(booking.id, bookingId));
  return row;
}

/** Call after a booking is created or its status changes. Never throws. */
export async function syncBooking(db: Db, bookingId: string) {
  if (!googleConfigured()) return;
  try {
    const row = await loadBooking(db, bookingId);
    if (!row) return;
    const members = await connectedMembers(db, row.booking.teamId);
    await Promise.all(
      members.map((member) =>
        withToken(db, member, (token) =>
          row.booking.status === "cancelled"
            ? deleteEvent(token, eventId(row.booking.id))
            : upsertEvent(token, memberEvent(row, member)),
        ),
      ),
    );
  } catch (error) {
    console.error(`[google] booking ${bookingId}`, error);
  }
}

function upcomingForTeam(db: Db, teamId: string, now: Date) {
  return db
    .select({ booking, categoryName: serviceCategory.nameBg })
    .from(booking)
    .innerJoin(serviceCategory, eq(serviceCategory.id, booking.categoryId))
    .where(and(eq(booking.teamId, teamId), ne(booking.status, "cancelled"), gt(booking.endAt, now)));
}

/**
 * Writes all of the team's upcoming bookings into one member's calendar: after they connect,
 * and after their reminder times change (the events are updated with the new reminders).
 */
export async function syncMemberUpcoming(db: Db, memberId: string, now: Date = new Date()) {
  if (!googleConfigured()) return;
  const [member] = await db.select().from(teamMember).where(eq(teamMember.id, memberId));
  if (!member?.googleRefreshToken) return;
  const rows = await upcomingForTeam(db, member.teamId, now);
  await withToken(db, member, async (token) => {
    for (const row of rows) await upsertEvent(token, memberEvent(row, member));
  });
}

/** Removes the team's upcoming bookings from a member's calendar before they disconnect. */
export async function removeMemberUpcoming(db: Db, member: Member, now: Date = new Date()) {
  if (!googleConfigured() || !member.googleRefreshToken) return;
  const rows = await upcomingForTeam(db, member.teamId, now);
  await withToken(db, member, async (token) => {
    for (const row of rows) await deleteEvent(token, eventId(row.booking.id));
  });
}
