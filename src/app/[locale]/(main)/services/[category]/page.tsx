import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { categorySlug, pick } from "@/lib/localized";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";
import { VisitChoice } from "./visit-choice";

async function load(slug: string) {
  const catalog = await getCatalog(db);
  return catalog.find((c) => c.slugBg === slug || c.slugEn === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/services/[category]">): Promise<Metadata> {
  const { locale, category: slug } = await params;
  const category = await load(slug);
  if (!category) return {};
  return {
    title: pick(locale, category.nameBg, category.nameEn),
    description: pick(locale, category.descriptionBg, category.descriptionEn) ?? undefined,
  };
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/services/[category]">) {
  const { locale, category: slug } = await params;
  setRequestLocale(locale);
  await connection();
  const category = await load(slug);
  if (!category) notFound();

  // After switching language the URL still has the other language's slug: fix it.
  const expected = categorySlug(locale, category);
  if (slug !== expected) {
    redirect({
      href: { pathname: "/services/[category]", params: { category: expected } },
      locale: locale as Locale,
    });
  }

  const t = await getTranslations("category");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <div className="mt-6 flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent text-primary">
          <CategoryIcon name={category.icon} className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
            {pick(locale, category.nameBg, category.nameEn)}
          </h1>
          <p className="mt-1 text-muted-foreground">{pick(locale, category.descriptionBg, category.descriptionEn)}</p>
        </div>
      </div>
      <h2 className="mt-10 mb-5 text-xl font-semibold">{t("chooseVisit")}</h2>
      <VisitChoice slug={expected} durations={category.durations} />
    </div>
  );
}
