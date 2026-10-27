// Shared by the chat bot (browser) and the server action, so both check the same rules.
// Error messages are translation keys under "chat.errors" in messages/*.json.
import { z } from "zod";
import { normalizeBgPhone } from "./booking-schema";

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .refine((v) => v === undefined || normalizeBgPhone(v) !== null, "phoneInvalid")
  .transform((v) => (v ? normalizeBgPhone(v)! : null));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => v || undefined)
  .pipe(z.email("emailInvalid").max(200, "tooLong").optional())
  .transform((v) => v ?? null);

export const contactRequestSchema = z
  .object({
    name: z.string().trim().min(2, "nameRequired").max(100, "tooLong"),
    phone: optionalPhone,
    email: optionalEmail,
    description: z.string().trim().min(10, "descriptionRequired").max(2000, "tooLong"),
    locale: z.enum(["bg", "en"]),
    pageUrl: z
      .string()
      .max(500)
      .optional()
      .transform((v) => v || null),
    consent: z.literal(true, "consentRequired"),
  })
  .refine((v) => v.phone || v.email, { message: "contactRequired", path: ["phone"] });

export type ContactRequestInput = z.input<typeof contactRequestSchema>;
export type ContactRequestData = z.output<typeof contactRequestSchema>;

/** Tells apart what the visitor typed in the single "phone or email" chat answer. */
export function parseContact(input: string): { phone: string } | { email: string } | null {
  const value = input.trim();
  if (value.includes("@")) return z.email().safeParse(value).success ? { email: value.toLowerCase() } : null;
  const phone = normalizeBgPhone(value);
  return phone ? { phone } : null;
}
