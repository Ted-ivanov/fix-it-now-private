import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Link } from "@/i18n/navigation";
import { pick } from "@/lib/localized";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";
import { listPublishedGalleries } from "@/server/services/galleries";

export async function generateMetadata({ params }: PageProps<"/[locale]/our-work">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ourWork" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function OurWorkPage({ params, searchParams }: PageProps<"/[locale]/our-work">) {
  const { locale } = await params;
  const { category: filter } = await searchParams;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations("ourWork");

  const categories = await getCatalog(db);
  const active = categories.find((c) => c.slugBg === filter || c.slugEn === filter);
  const items = await listPublishedGalleries(db, { categoryId: active?.id });

  const chip = (selected: boolean) =>
    cn(
      "rounded-full border px-4 py-1.5 text-sm font-medium transition",
      selected ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50",
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{t("subtitle")}</p>
      <nav className="mt-8 mb-6 flex flex-wrap gap-2" aria-label={t("title")}>
        <Link href="/our-work" className={chip(!active)} aria-current={!active ? "page" : undefined}>
          {t("all")}
        </Link>
        {categories.map((c) => {
          const slug = locale === "en" ? c.slugEn : c.slugBg;
          return (
            <Link
              key={c.id}
              href={{ pathname: "/our-work", query: { category: slug } }}
              className={chip(active?.id === c.id)}
              aria-current={active?.id === c.id ? "page" : undefined}
            >
              {pick(locale, c.nameBg, c.nameEn)}
            </Link>
          );
        })}
      </nav>
      <GalleryGrid items={items} locale={locale} />
    </div>
  );
}
