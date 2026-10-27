"use server";

// Admin mutations. Every action re-checks the session: server actions are public endpoints.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { sendBookingCancelledEmail } from "@/server/email/booking-emails";
import { revokeToken } from "@/server/google/client";
import { createConnectLink, disconnectGoogle } from "@/server/google/connect";
import { syncBooking, syncMemberUpcoming } from "@/server/google/sync";
import * as admin from "@/server/services/admin";
import * as contactRequests from "@/server/services/contact-requests";
import * as galleries from "@/server/services/galleries";
import { sofiaInstant } from "@/server/services/time";
import { presignUpload } from "@/server/storage";

type Result = { ok: true } | { ok: false; error: string };

function refresh() {
  // Admin changes can affect every public page (slots, galleries, categories).
  revalidatePath("/", "layout");
}

async function run(fn: () => Promise<unknown>): Promise<Result> {
  await requireAdmin();
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: "Невалидни данни. Проверете полетата." };
    console.error("[admin]", error);
    return { ok: false, error: "Възникна грешка. Опитайте отново." };
  }
}

const uuid = z.uuid();
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => v || null)
  .nullable()
  .optional();

// ---------------------------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------------------------

export async function setBookingStatusAction(id: string, status: admin.BookingStatus, notifyCustomer = true) {
  return run(async () => {
    const parsed = z.object({ id: uuid, status: z.enum(["pending", "confirmed", "done", "cancelled"]) }).parse({ id, status });
    const updated = await admin.setBookingStatus(db, parsed.id, parsed.status);
    if (!updated) return;
    after(() => syncBooking(db, updated.id));
    if (parsed.status === "cancelled" && notifyCustomer) await sendBookingCancelledEmail(db, updated.id);
  });
}

export async function setBookingNoteAction(id: string, note: string) {
  return run(() => admin.setBookingNote(db, uuid.parse(id), z.string().max(2000).parse(note).trim() || null));
}

// ---------------------------------------------------------------------------------------------
// Teams and hours
// ---------------------------------------------------------------------------------------------

const teamInput = z.object({
  name: z.string().trim().min(1).max(100),
  active: z.boolean(),
  categoryIds: z.array(uuid),
});

export async function createTeamAction(input: { name: string; categoryIds: string[] }) {
  return run(() => {
    const p = teamInput.omit({ active: true }).parse(input);
    return admin.createTeam(db, p.name, p.categoryIds);
  });
}

export async function updateTeamAction(id: string, input: z.input<typeof teamInput>) {
  return run(() => admin.updateTeam(db, uuid.parse(id), teamInput.parse(input)));
}

export async function deleteTeamAction(id: string) {
  await requireAdmin();
  const teamId = uuid.parse(id);
  // A team is only deleted when it has no bookings, so its members' calendars hold no events:
  // revoking their Google access is enough.
  const tokens = await admin.memberGoogleTokens(db, teamId);
  const result = await admin.deleteTeam(db, teamId);
  if (result.deleted) await Promise.all(tokens.map(revokeToken));
  refresh();
  return result;
}

const memberInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.union([z.email(), z.literal("")]).transform((v) => v.toLowerCase() || null),
});

export async function createMemberAction(teamId: string, input: z.input<typeof memberInput>) {
  return run(() => admin.createMember(db, uuid.parse(teamId), memberInput.parse(input)));
}

const reminders = z
  .array(
    z.object({
      method: z.enum(["popup", "email"]),
      minutes: z.number().int().min(0).max(40320), // Google's limit: 4 weeks
    }),
  )
  .max(5);

export async function updateMemberAction(
  id: string,
  input: z.input<typeof memberInput> & { reminders: z.input<typeof reminders> },
) {
  return run(async () => {
    const memberId = uuid.parse(id);
    const resync = await admin.updateMember(db, memberId, {
      ...memberInput.parse(input),
      reminders: reminders.parse(input.reminders),
    });
    // Update the reminders on the events that are already in the calendar.
    if (resync) after(() => syncMemberUpcoming(db, memberId));
  });
}

export async function deleteMemberAction(id: string) {
  return run(async () => {
    const memberId = uuid.parse(id);
    await disconnectGoogle(db, memberId);
    await admin.deleteMember(db, memberId);
  });
}

export async function createConnectLinkAction(memberId: string) {
  await requireAdmin();
  return { url: await createConnectLink(db, uuid.parse(memberId)) };
}

export async function disconnectGoogleAction(memberId: string) {
  return run(() => disconnectGoogle(db, uuid.parse(memberId)));
}

const hoursRows = z
  .array(
    z
      .object({
        weekday: z.number().int().min(1).max(7),
        openMinute: z.number().int().min(0).max(1439),
        closeMinute: z.number().int().min(1).max(1440),
      })
      .refine((r) => r.openMinute < r.closeMinute),
  )
  .max(14);

/** teamId null = company default hours. */
export async function setWorkingHoursAction(teamId: string | null, rows: admin.HoursRow[]) {
  return run(() => admin.setWorkingHours(db, teamId === null ? null : uuid.parse(teamId), hoursRows.parse(rows)));
}

const sofiaLocal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .transform((v) => {
    const [day, hhmm] = v.split("T");
    const [h, m] = hhmm.split(":").map(Number);
    return sofiaInstant(day, h * 60 + m);
  });

/** Times come from <input type="datetime-local"> and are read as Sofia time. */
export async function addTimeOffAction(input: { teamId: string; start: string; end: string; reason: string }) {
  return run(() => {
    const p = z
      .object({ teamId: uuid, start: sofiaLocal, end: sofiaLocal, reason: optionalText })
      .refine((v) => v.start < v.end)
      .parse(input);
    return admin.addTimeOff(db, { teamId: p.teamId, startAt: p.start, endAt: p.end, reason: p.reason ?? null });
  });
}

export async function deleteTimeOffAction(id: string) {
  return run(() => admin.deleteTimeOff(db, uuid.parse(id)));
}

// ---------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------

export async function updateSettingsAction(input: {
  travelBufferMinutes: number;
  slotStepMinutes: number;
  bookingHorizonDays: number;
  minNoticeHours: number;
  notificationEmail: string;
}) {
  return run(() =>
    admin.updateSettings(
      db,
      z
        .object({
          travelBufferMinutes: z.number().int().min(0).max(240),
          slotStepMinutes: z.number().int().min(5).max(240),
          bookingHorizonDays: z.number().int().min(1).max(365),
          minNoticeHours: z.number().int().min(0).max(168),
          notificationEmail: z.union([z.email(), z.literal("")]).transform((v) => v || null),
        })
        .parse(input),
    ),
  );
}

export async function updateCategoryAction(id: string, input: Parameters<typeof admin.updateCategory>[2]) {
  return run(() =>
    admin.updateCategory(
      db,
      uuid.parse(id),
      z
        .object({
          nameBg: z.string().trim().min(1).max(100),
          nameEn: optionalText.transform((v) => v ?? null),
          descriptionBg: optionalText.transform((v) => v ?? null),
          descriptionEn: optionalText.transform((v) => v ?? null),
          icon: z.string().min(1).max(40),
          active: z.boolean(),
          bufferMinutes: z.number().int().min(0).max(240).nullable(),
          inspectionMinutes: z.number().int().min(15).max(600),
          repairMinutes: z.number().int().min(15).max(600),
        })
        .parse(input),
    ),
  );
}

export async function addClosedDayAction(day: string, note: string) {
  return run(() => admin.addClosedDay(db, z.iso.date().parse(day), note.trim() || null));
}

export async function deleteClosedDayAction(day: string) {
  return run(() => admin.deleteClosedDay(db, z.iso.date().parse(day)));
}

// ---------------------------------------------------------------------------------------------
// Galleries
// ---------------------------------------------------------------------------------------------

const galleryInput = z.object({
  titleBg: z.string().trim().min(1).max(150),
  titleEn: optionalText,
  descriptionBg: optionalText,
  descriptionEn: optionalText,
  categoryId: uuid.nullable().optional(),
  published: z.boolean().optional(),
});

export async function createGalleryAction(input: z.input<typeof galleryInput>) {
  await requireAdmin();
  const created = await galleries.createGallery(db, galleryInput.parse(input));
  refresh();
  return { id: created.id };
}

export async function updateGalleryAction(id: string, input: z.input<typeof galleryInput>) {
  return run(() => galleries.updateGallery(db, uuid.parse(id), galleryInput.partial().parse(input)));
}

export async function deleteGalleryAction(id: string) {
  return run(() => galleries.deleteGallery(db, uuid.parse(id)));
}

const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif", ""];

/** Presigned URLs so the browser uploads originals straight to storage. */
export async function createUploadUrlsAction(files: { name: string; type: string; size: number }[]) {
  await requireAdmin();
  const list = z
    .array(z.object({ name: z.string().max(300), type: z.string().max(100), size: z.number().int().positive().max(40 * 1024 * 1024) }))
    .min(1)
    .max(50)
    .parse(files);
  return Promise.all(
    list.map(async (f) => {
      const type = ALLOWED_UPLOAD_TYPES.includes(f.type) ? f.type || "application/octet-stream" : "application/octet-stream";
      const key = `uploads/${crypto.randomUUID()}`;
      return { key, url: await presignUpload(key, type), contentType: type };
    }),
  );
}

/** Called once per uploaded file: makes the web versions and adds the photo to the gallery. */
export async function processUploadAction(galleryId: string, uploadKey: string) {
  await requireAdmin();
  try {
    const photo = await galleries.addPhotoFromUpload(db, uuid.parse(galleryId), z.string().regex(/^uploads\/[0-9a-f-]{36}$/).parse(uploadKey));
    refresh();
    return { ok: true as const, photoId: photo.id };
  } catch (error) {
    console.error("[upload]", error);
    return { ok: false as const, error: "Файлът не е снимка или е повреден." };
  }
}

export async function updatePhotoAction(photoId: string, input: { captionBg: string; captionEn: string }) {
  return run(() =>
    galleries.updatePhoto(db, uuid.parse(photoId), {
      captionBg: input.captionBg.trim().slice(0, 300) || null,
      captionEn: input.captionEn.trim().slice(0, 300) || null,
    }),
  );
}

export async function deletePhotoAction(photoId: string) {
  return run(() => galleries.deletePhoto(db, uuid.parse(photoId)));
}

export async function reorderPhotosAction(galleryId: string, orderedIds: string[]) {
  return run(() => galleries.reorderPhotos(db, uuid.parse(galleryId), z.array(uuid).max(1000).parse(orderedIds)));
}

export async function setCoverAction(galleryId: string, photoId: string) {
  return run(() => galleries.setCover(db, uuid.parse(galleryId), uuid.parse(photoId)));
}

// ---------------------------------------------------------------------------------------------
// Chat bot contact requests
// ---------------------------------------------------------------------------------------------

export async function updateContactEmailsAction(emails: string[]) {
  return run(() =>
    admin.updateContactEmails(
      db,
      z
        .array(z.string().trim().toLowerCase().pipe(z.email()))
        .max(20)
        .transform((list) => [...new Set(list)])
        .parse(emails.filter((e) => e.trim())),
    ),
  );
}

export async function setContactRequestHandledAction(id: string, handled: boolean) {
  return run(() => contactRequests.setContactRequestHandled(db, uuid.parse(id), handled));
}

export async function deleteContactRequestAction(id: string) {
  return run(() => contactRequests.deleteContactRequest(db, uuid.parse(id)));
}
