import { and, eq, ne } from "drizzle-orm";
import { customAlphabet, nanoid } from "nanoid";
import type { Db } from "@/server/db";
import { booking, bookingPhoto } from "@/server/db/schema";
import { normalizeBgPhone, type BookingRequest } from "@/lib/booking-schema";
import { getRules, getSlots } from "./availability";
import { addMinutes, sofiaDay } from "./time";

// No 0/O, 1/I/L: easy to read out over the phone.
const refCode = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 6);

export class SlotTakenError extends Error {
  constructor() {
    super("The selected time is no longer available");
  }
}

export class DisclaimerRequiredError extends Error {
  constructor() {
    super("A repair visit requires accepting the extra-charge notice");
  }
}

export type NewBookingPhoto = { storageKey: string; width: number; height: number };

function pgErrorCode(error: unknown): string | undefined {
  // Drizzle may wrap the driver error; the Postgres code sits on it or on its cause.
  for (let e: unknown = error; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

const EXCLUSION_VIOLATION = "23P01";
const UNIQUE_VIOLATION = "23505";

/**
 * Books the requested slot with the least busy free team. If another customer takes the
 * same team at the same moment, Postgres rejects the insert and the next free team is tried.
 */
export async function createBooking(
  db: Db,
  input: BookingRequest,
  photos: NewBookingPhoto[] = [],
  now: Date = new Date(),
) {
  if (input.visitType === "repair" && !input.repairDisclaimerAccepted) {
    throw new DisclaimerRequiredError();
  }

  const startAt = new Date(input.startAt);
  const rules = await getRules(db, input.categoryId, input.visitType);
  const slots = await getSlots(db, {
    categoryId: input.categoryId,
    type: input.visitType,
    day: sofiaDay(startAt),
    now,
  });
  const slot = slots.find((s) => s.start.getTime() === startAt.getTime());
  if (!slot) throw new SlotTakenError();

  const endAt = addMinutes(startAt, rules.durationMinutes);
  const blockedUntil = addMinutes(endAt, rules.bufferMinutes);

  for (const teamId of slot.freeTeamIds) {
    for (let refAttempt = 0; refAttempt < 3; refAttempt++) {
      try {
        return await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(booking)
            .values({
              ref: `FN-${refCode()}`,
              categoryId: input.categoryId,
              visitType: input.visitType,
              teamId,
              startAt,
              endAt,
              blockedUntil,
              customerName: input.customerName.trim(),
              phone: normalizeBgPhone(input.phone)!,
              email: input.email.trim().toLowerCase(),
              address: input.address.trim(),
              description: input.description.trim(),
              locale: input.locale,
              repairDisclaimerAcceptedAt:
                input.visitType === "repair" && input.repairDisclaimerAccepted ? now : null,
              consentAt: now,
              cancelToken: nanoid(32),
            })
            .returning();
          if (photos.length > 0) {
            await tx.insert(bookingPhoto).values(photos.map((p) => ({ ...p, bookingId: created.id })));
          }
          return created;
        });
      } catch (error) {
        const code = pgErrorCode(error);
        if (code === EXCLUSION_VIOLATION) break; // this team was just taken: try the next one
        if (code === UNIQUE_VIOLATION) continue; // reference code collision: new code
        throw error;
      }
    }
  }
  throw new SlotTakenError();
}

/** Customer cancellation from the link in the confirmation email. */
export async function cancelBookingByToken(db: Db, token: string, now: Date = new Date()) {
  const [row] = await db.select().from(booking).where(eq(booking.cancelToken, token));
  if (!row) return { status: "not-found" as const };
  if (row.status === "cancelled") return { status: "already-cancelled" as const, booking: row };
  if (row.status === "done" || row.startAt <= now) return { status: "too-late" as const, booking: row };

  const [updated] = await db
    .update(booking)
    .set({ status: "cancelled" })
    .where(and(eq(booking.id, row.id), ne(booking.status, "cancelled")))
    .returning();
  return { status: "cancelled" as const, booking: updated ?? row };
}
