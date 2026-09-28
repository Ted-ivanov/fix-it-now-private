import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toClientCategories } from "@/components/booking/client-category";
import { BookingWizard } from "@/components/variants/v2/booking-wizard";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";

export default async function V2Book({ params, searchParams }: PageProps<"/[locale]/v2/book">) {
  const { locale } = await params;
  const q = await searchParams;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations("booking");
  const categories = toClientCategories(await getCatalog(db), locale);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <BookingWizard
        categories={categories}
        initialCategory={typeof q.category === "string" ? q.category : undefined}
        problem={typeof q.problem === "string" ? q.problem.slice(0, 200) : undefined}
      />
    </div>
  );
}
