"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { MAX_BOOKING_PHOTOS, MAX_PHOTO_BYTES, bookingRequestSchema } from "@/lib/booking-schema";
import { db } from "@/server/db";
import { sendNewBookingEmails } from "@/server/email/booking-emails";
import { syncBooking } from "@/server/google/sync";
import { UnknownServiceError } from "@/server/services/availability";
import { createBooking, DisclaimerRequiredError, SlotTakenError } from "@/server/services/bookings";
import { customerCalendarLinks, loadCustomerBooking } from "@/server/services/customer-calendar";
import { processCustomerPhoto, UnsupportedImageError } from "@/server/services/images";
import { checkRateLimit } from "@/server/services/rate-limit";
import { verifyTurnstile } from "@/server/services/turnstile";
import { deleteObjects, putObject } from "@/server/storage";

export type BookingErrorCode =
  | "slotTaken"
  | "rateLimited"
  | "captcha"
  | "photoInvalid"
  | "tooManyPhotos"
  | "invalid"
  | "generic";

export type BookingActionResult =
  | { ok: true; ref: string; startAt: string; email: string; calendar: { google: string; ics: string } }
  | { ok: false; error: BookingErrorCode; fieldErrors?: Record<string, string> };

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function submitBooking(formData: FormData): Promise<BookingActionResult> {
  // Honeypot: real people never fill this hidden field.
  if (formData.get("website")) return { ok: false, error: "generic" };

  const ip = await clientIp();
  if (!(await checkRateLimit(db, `booking:${ip ?? "unknown"}`, 5, 600))) {
    return { ok: false, error: "rateLimited" };
  }
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response") as string | null, ip))) {
    return { ok: false, error: "captcha" };
  }

  const parsed = bookingRequestSchema.safeParse({
    categoryId: formData.get("categoryId"),
    visitType: formData.get("visitType"),
    startAt: formData.get("startAt"),
    repairDisclaimerAccepted: formData.get("repairDisclaimerAccepted") === "true",
    locale: formData.get("locale"),
    customerName: formData.get("customerName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    description: formData.get("description"),
    consent: formData.get("consent") === "true",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "invalid", fieldErrors };
  }

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_BOOKING_PHOTOS) return { ok: false, error: "tooManyPhotos" };
  if (files.some((f) => f.size > MAX_PHOTO_BYTES)) return { ok: false, error: "photoInvalid" };

  const folder = `bookings/${crypto.randomUUID()}`;
  const uploaded: { storageKey: string; width: number; height: number }[] = [];
  try {
    for (const [i, file] of files.entries()) {
      const photo = await processCustomerPhoto(Buffer.from(await file.arrayBuffer()));
      const storageKey = `${folder}/${i + 1}.webp`;
      await putObject("private", storageKey, photo.data, "image/webp");
      uploaded.push({ storageKey, width: photo.width, height: photo.height });
    }

    const created = await createBooking(db, parsed.data, uploaded);
    // Emails and team calendars are updated after the response so the customer isn't kept waiting.
    after(() => Promise.all([sendNewBookingEmails(db, created.id), syncBooking(db, created.id)]));
    const row = await loadCustomerBooking(db, { id: created.id });
    return {
      ok: true,
      ref: created.ref,
      startAt: created.startAt.toISOString(),
      email: created.email,
      calendar: customerCalendarLinks(row),
    };
  } catch (error) {
    await deleteObjects("private", uploaded.map((u) => u.storageKey)).catch(() => {});
    if (error instanceof SlotTakenError) return { ok: false, error: "slotTaken" };
    if (error instanceof UnsupportedImageError) return { ok: false, error: "photoInvalid" };
    if (error instanceof DisclaimerRequiredError || error instanceof UnknownServiceError) {
      return { ok: false, error: "invalid" };
    }
    console.error("[booking]", error);
    return { ok: false, error: "generic" };
  }
}
