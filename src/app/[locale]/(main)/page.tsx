import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryGrid } from "@/components/site/category-grid";
import { LocalBusinessJsonLd } from "@/components/site/json-ld";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations("home");
  const categories = await getCatalog(db);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-12 sm:py-20">
      <LocalBusinessJsonLd locale={locale} />
      <h1 className="max-w-3xl text-center text-3xl font-bold tracking-tight text-balance sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-2xl text-center text-lg text-pretty text-muted-foreground sm:text-xl">
        {t("subtitle")}
      </p>
      <div className="mt-10 w-full sm:mt-14">
        <CategoryGrid categories={categories} locale={locale} label={t("categoriesLabel")} />
      </div>
    </div>
  );
}
