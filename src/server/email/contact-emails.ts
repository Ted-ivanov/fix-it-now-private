import type { Db } from "@/server/db";
import { env } from "@/server/env";
import { contactRecipients, type ContactRequest } from "@/server/services/contact-requests";
import { formatWhen } from "./booking-emails";
import { sendEmail } from "./send";
import { ContactRequestAdminEmail } from "./templates";

/** Sends a new chat bot request to every address in the admin's contact list. */
export async function sendContactRequestEmail(db: Db, row: ContactRequest) {
  const to = await contactRecipients(db);
  if (to.length === 0) {
    console.warn("[contact] no recipients configured; request saved only in the admin");
    return;
  }
  try {
    await sendEmail({
      to,
      replyTo: row.email ?? undefined,
      subject: `Ново запитване от чата: ${row.name}`,
      react: ContactRequestAdminEmail({
        name: row.name,
        phone: row.phone,
        email: row.email,
        description: row.description,
        when: formatWhen(row.createdAt, "bg"),
        adminUrl: `${env.SITE_URL}/admin/inquiries`,
      }),
    });
  } catch (error) {
    console.error("[email]", error);
  }
}
