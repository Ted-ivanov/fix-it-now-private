import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/server/db";
import { booking } from "@/server/db/schema";
import { CancelForm } from "./cancel-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/cancel/[token]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cancel" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

// The link in the email only shows this page; cancelling needs a click, because mail
// scanners open links automatically.
export default async function CancelPage({ params }: PageProps<"/[locale]/cancel/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations("cancel");
  const format = await getFormatter();
  const [row] = await db
    .select({ startAt: booking.startAt, status: booking.status, ref: booking.ref })
    .from(booking)
    .where(eq(booking.cancelToken, token));

  let body;
  if (!row) body = <p>{t("notFound")}</p>;
  else if (row.status === "cancelled") body = <p>{t("alreadyCancelled")}</p>;
  else if (row.status === "done" || row.startAt <= new Date()) body = <p>{t("tooLate")}</p>;
  else {
    const when = format.dateTime(row.startAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    body = (
      <div className="grid justify-items-start gap-6">
        <p className="text-lg">
          {t("confirmQuestion", { when })} <span className="font-mono text-muted-foreground">({row.ref})</span>
        </p>
        <CancelForm token={token} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{t("title")}</h1>
      {body}
    </div>
  );
}
