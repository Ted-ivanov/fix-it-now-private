// The customer's own calendar entry for their visit: used in the email, on the success screen
// and by the .ics download.
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { booking, serviceCategory } from "@/server/db/schema";
import { env } from "@/server/env";
import { googleCalendarUrl, type CalendarEntry } from "@/lib/calendar-links";
import { pick } from "@/lib/localized";
import { formatPhone, site } from "@/lib/site";

type Row = { booking: typeof booking.$inferSelect; category: typeof serviceCategory.$inferSelect };

const text = {
  bg: {
    visit: { inspection: "Оглед и оферта", repair: "Посещение за ремонт" },
    ref: "Номер",
    phone: "Телефон на Fix It Now",
    cancel: "Отказване",
  },
  en: {
    visit: { inspection: "Inspection & Quote", repair: "Repair visit" },
    ref: "Number",
    phone: "Fix It Now phone",
    cancel: "Cancel",
  },
} as const;

export function customerCalendarEntry(row: Row, cancelUrl: string): CalendarEntry {
  const lang = row.booking.locale;
  const t = text[lang];
  return {
    uid: `${row.booking.id}@fix-it-now`,
    title: `Fix It Now: ${t.visit[row.booking.visitType]} – ${pick(lang, row.category.nameBg, row.category.nameEn)}`,
    description: [
      `${t.ref}: ${row.booking.ref}`,
      `${t.phone}: ${formatPhone(site.phone)}`,
      `${t.cancel}: ${cancelUrl}`,
    ].join("\n"),
    location: row.booking.address,
    start: row.booking.startAt,
    end: row.booking.endAt,
    cancelled: row.booking.status === "cancelled",
  };
}

export function icsUrl(cancelToken: string) {
  return `${env.SITE_URL}/api/calendar/${cancelToken}`;
}

export function cancelUrl(locale: "bg" | "en", token: string) {
  return locale === "bg" ? `${env.SITE_URL}/otkazvane/${token}` : `${env.SITE_URL}/en/cancel/${token}`;
}

export async function loadCustomerBooking(db: Db, where: { id: string } | { cancelToken: string }) {
  const [row] = await db
    .select({ booking, category: serviceCategory })
    .from(booking)
    .innerJoin(serviceCategory, eq(serviceCategory.id, booking.categoryId))
    .where("id" in where ? eq(booking.id, where.id) : eq(booking.cancelToken, where.cancelToken));
  return row;
}

/** Both "add to calendar" links for a booking. */
export function customerCalendarLinks(row: Row) {
  const entry = customerCalendarEntry(row, cancelUrl(row.booking.locale, row.booking.cancelToken));
  return { google: googleCalendarUrl(entry), ics: icsUrl(row.booking.cancelToken) };
}
