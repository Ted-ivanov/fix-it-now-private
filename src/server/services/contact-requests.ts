import { desc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { contactRequest } from "@/server/db/schema";
import type { ContactRequestData } from "@/lib/contact-schema";
import { getSettings } from "./settings";
import { TIME_ZONE } from "./time";

export type ContactRequest = typeof contactRequest.$inferSelect;

export async function createContactRequest(db: Db, input: ContactRequestData, now = new Date()) {
  const { consent: _consent, ...values } = input;
  const [row] = await db
    .insert(contactRequest)
    .values({ ...values, consentAt: now })
    .returning();
  return row;
}

export function listContactRequests(db: Db, opts: { handled?: boolean } = {}) {
  return db
    .select()
    .from(contactRequest)
    .where(opts.handled === undefined ? undefined : eq(contactRequest.handled, opts.handled))
    .orderBy(desc(contactRequest.createdAt));
}

export async function setContactRequestHandled(db: Db, id: string, handled: boolean) {
  await db.update(contactRequest).set({ handled }).where(eq(contactRequest.id, id));
}

export async function deleteContactRequest(db: Db, id: string) {
  await db.delete(contactRequest).where(eq(contactRequest.id, id));
}

/** Who gets the chat bot emails: the configured list, or the booking notification address. */
export async function contactRecipients(db: Db): Promise<string[]> {
  const settings = await getSettings(db);
  if (settings.contactEmails.length > 0) return settings.contactEmails;
  return settings.notificationEmail ? [settings.notificationEmail] : [];
}

const csvDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function csvCell(value: string) {
  // Leading = + - @ would run as a formula when the file is opened in Excel.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n;]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** CSV for Excel: UTF-8 BOM so Cyrillic opens correctly. */
export function contactRequestsCsv(rows: ContactRequest[]) {
  const header = ["Дата", "Име", "Телефон", "Имейл", "Описание", "Език", "Обработено", "Страница"];
  const lines = rows.map((r) =>
    [
      csvDate.format(r.createdAt),
      r.name,
      r.phone ?? "",
      r.email ?? "",
      r.description,
      r.locale,
      r.handled ? "да" : "не",
      r.pageUrl ?? "",
    ].map(csvCell),
  );
  return "﻿" + [header, ...lines].map((cells) => cells.join(",")).join("\r\n") + "\r\n";
}
