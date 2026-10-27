"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { contactRequestSchema } from "@/lib/contact-schema";
import { db } from "@/server/db";
import { sendContactRequestEmail } from "@/server/email/contact-emails";
import { createContactRequest } from "@/server/services/contact-requests";
import { checkRateLimit } from "@/server/services/rate-limit";
import { verifyTurnstile } from "@/server/services/turnstile";

export type ContactErrorCode = "rateLimited" | "captcha" | "invalid" | "generic";

export type ContactActionResult =
  { ok: true } | { ok: false; error: ContactErrorCode; fieldErrors?: Record<string, string> };

export async function submitContactRequest(input: {
  name: string;
  phone?: string;
  email?: string;
  description: string;
  locale: string;
  pageUrl?: string;
  consent: boolean;
  website?: string;
  turnstileToken?: string | null;
}): Promise<ContactActionResult> {
  // Honeypot: real people never fill this hidden field.
  if (input.website) return { ok: false, error: "generic" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  if (!(await checkRateLimit(db, `contact:${ip ?? "unknown"}`, 5, 600))) {
    return { ok: false, error: "rateLimited" };
  }
  if (!(await verifyTurnstile(input.turnstileToken ?? null, ip))) {
    return { ok: false, error: "captcha" };
  }

  const parsed = contactRequestSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "invalid", fieldErrors };
  }

  try {
    const row = await createContactRequest(db, parsed.data);
    after(() => sendContactRequestEmail(db, row));
    return { ok: true };
  } catch (error) {
    console.error("[contact]", error);
    return { ok: false, error: "generic" };
  }
}
