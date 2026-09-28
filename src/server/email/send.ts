import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";
import { env } from "@/server/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/** Sends an email with Resend, or prints it to the terminal when no API key is set. */
export async function sendEmail(params: { to: string; subject: string; react: ReactElement; replyTo?: string }) {
  const text = await render(params.react, { plainText: true });
  if (!resend) {
    console.info(`\n[email] to: ${params.to}\n[email] subject: ${params.subject}\n${text}\n`);
    return;
  }
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    react: params.react,
    text,
    replyTo: params.replyTo,
  });
  if (error) throw new Error(`Email failed: ${error.message}`);
}
