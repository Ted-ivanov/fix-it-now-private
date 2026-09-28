// Shared by the booking form (browser) and the server action, so both check the same rules.
// Error messages are translation keys under "booking.errors" in messages/*.json.
import { z } from "zod";

export const MAX_BOOKING_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** Bulgarian numbers: "0888 123 456", "+359 888 123 456", "00359888123456" → "+359888123456". */
export function normalizeBgPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  let national: string;
  if (/^\+359\d{8,9}$/.test(digits)) national = digits.slice(4);
  else if (/^00359\d{8,9}$/.test(digits)) national = digits.slice(5);
  else if (/^0\d{8,9}$/.test(digits)) national = digits.slice(1);
  else return null;
  return `+359${national}`;
}

export const visitTypes = ["inspection", "repair"] as const;

export const bookingDetailsSchema = z.object({
  customerName: z.string().trim().min(2, "nameRequired").max(100, "tooLong"),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizeBgPhone(v) !== null, "phoneInvalid"),
  email: z.email("emailInvalid").max(200, "tooLong"),
  address: z.string().trim().min(5, "addressRequired").max(300, "tooLong"),
  description: z.string().trim().min(10, "descriptionRequired").max(2000, "tooLong"),
  consent: z.literal(true, "consentRequired"),
});

export type BookingDetails = z.infer<typeof bookingDetailsSchema>;

export const bookingRequestSchema = bookingDetailsSchema.extend({
  categoryId: z.uuid(),
  visitType: z.enum(visitTypes),
  startAt: z.iso.datetime({ offset: true }),
  repairDisclaimerAccepted: z.boolean(),
  locale: z.enum(["bg", "en"]),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
