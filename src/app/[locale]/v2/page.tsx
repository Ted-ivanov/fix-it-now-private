import { CalendarCheck, PhoneCall, Wrench } from "lucide-react";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toClientCategories } from "@/components/booking/client-category";
import { ProblemSearch } from "@/components/variants/v2/problem-search";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";

export default async function V2Home({ params }: PageProps<"/[locale]/v2">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations("v2");
  const categories = toClientCategories(await getCatalog(db), locale);
  const steps = [
    { icon: CalendarCheck, text: t("how1") },
    { icon: PhoneCall, text: t("how2") },
    { icon: Wrench, text: t("how3") },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-14 sm:py-24">
      <h1 className="text-center text-4xl font-bold tracking-tight text-balance sm:text-6xl">{t("heroTitle")}</h1>
      <p className="mt-4 mb-10 max-w-xl text-center text-lg text-muted-foreground">{t("heroSubtitle")}</p>
      <ProblemSearch categories={categories} />
      <p className="mt-6 text-sm font-medium text-muted-foreground">
        ✓ {t("promise")} &nbsp; ✓ {t("freeCancel")}
      </p>

      <section className="mt-20 w-full">
        <h2 className="mb-6 text-center text-2xl font-bold">{t("howItWorks")}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex items-center gap-4 rounded-2xl border bg-background p-5 shadow-sm">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="flex items-center gap-2 font-medium">
                <Icon className="size-5 text-primary" aria-hidden />
                {text}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
