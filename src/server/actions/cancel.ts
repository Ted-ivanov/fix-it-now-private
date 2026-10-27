"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { sendBookingCancelledEmail } from "@/server/email/booking-emails";
import { syncBooking } from "@/server/google/sync";
import { cancelBookingByToken } from "@/server/services/bookings";
import { checkRateLimit } from "@/server/services/rate-limit";

export async function cancelBooking(token: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(db, `cancel:${ip}`, 10, 600))) return { status: "not-found" as const };

  const result = await cancelBookingByToken(db, token);
  if (result.status === "cancelled") {
    const id = result.booking.id;
    after(() => Promise.all([sendBookingCancelledEmail(db, id), syncBooking(db, id)]));
  }
  return { status: result.status };
}
