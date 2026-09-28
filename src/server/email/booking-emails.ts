import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { booking, bookingPhoto, serviceCategory } from "@/server/db/schema";
import { env } from "@/server/env";
import { getSettings } from "@/server/services/settings";
import { TIME_ZONE } from "@/server/services/time";
import { pick } from "@/lib/localized";
import { sendEmail } from "./send";
import {
  BookingCancelledEmail,
  bookingCancelledSubject,
  BookingConfirmationEmail,
  bookingConfirmationSubject,
  NewBookingAdminEmail,
  type BookingEmailData,
} from "./templates";

export function formatWhen(date: Date, locale: "bg" | "en") {
  return new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function cancelUrl(locale: "bg" | "en", token: string) {
  return locale === "bg" ? `${env.SITE_URL}/otkazvane/${token}` : `${env.SITE_URL}/en/cancel/${token}`;
}

async function load(db: Db, bookingId: string) {
  const [row] = await db
    .select({ booking, category: serviceCategory })
    .from(booking)
    .innerJoin(serviceCategory, eq(serviceCategory.id, booking.categoryId))
    .where(eq(booking.id, bookingId));
  return row;
}

function emailData(row: Awaited<ReturnType<typeof load>>, locale: "bg" | "en"): BookingEmailData {
  return {
    ref: row.booking.ref,
    customerName: row.booking.customerName,
    categoryName: pick(locale, row.category.nameBg, row.category.nameEn),
    visitType: row.booking.visitType,
    when: formatWhen(row.booking.startAt, locale),
    address: row.booking.address,
    cancelUrl: cancelUrl(locale, row.booking.cancelToken),
  };
}

/** Confirmation to the customer (in their language) and a notification to the office. */
export async function sendNewBookingEmails(db: Db, bookingId: string) {
  const row = await load(db, bookingId);
  if (!row) return;
  const lang = row.booking.locale;
  const tasks: Promise<unknown>[] = [
    sendEmail({
      to: row.booking.email,
      subject: bookingConfirmationSubject(lang, row.booking.ref),
      react: BookingConfirmationEmail({ lang, data: emailData(row, lang) }),
    }),
  ];

  const settings = await getSettings(db);
  if (settings.notificationEmail) {
    const photos = await db.select({ id: bookingPhoto.id }).from(bookingPhoto).where(eq(bookingPhoto.bookingId, bookingId));
    const data = emailData(row, "bg");
    tasks.push(
      sendEmail({
        to: settings.notificationEmail,
        replyTo: row.booking.email,
        subject: `Нова заявка ${row.booking.ref}: ${data.categoryName}, ${data.when}`,
        react: NewBookingAdminEmail({
          data,
          phone: row.booking.phone,
          email: row.booking.email,
          description: row.booking.description,
          photoCount: photos.length,
          adminUrl: `${env.SITE_URL}/admin/bookings/${bookingId}`,
        }),
      }),
    );
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) if (r.status === "rejected") console.error("[email]", r.reason);
}

export async function sendBookingCancelledEmail(db: Db, bookingId: string) {
  const row = await load(db, bookingId);
  if (!row) return;
  const lang = row.booking.locale;
  try {
    await sendEmail({
      to: row.booking.email,
      subject: bookingCancelledSubject(lang, row.booking.ref),
      react: BookingCancelledEmail({ lang, ref: row.booking.ref, when: formatWhen(row.booking.startAt, lang) }),
    });
  } catch (error) {
    console.error("[email]", error);
  }
}
