import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookingFlow } from "@/components/booking/booking-flow";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { categorySlug, pick } from "@/lib/localized";
import { db } from "@/server/db";
import { findCategoryBySlug } from "@/server/services/availability";

export async function generateMetadata({ params }: PageProps<"/[locale]/services/[category]/book">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "booking" });
  // The booking step has no value in search results.
  return { title: t("title"), robots: { index: false } };
}

export default async function BookPage({ params, searchParams }: PageProps<"/[locale]/services/[category]/book">) {
  const { locale, category: slug } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await connection();

  const category = await findCategoryBySlug(db, slug);
  if (!category) notFound();
  const expected = categorySlug(locale, category);
  const type = query.type === "repair" ? "repair" : query.type === "inspection" ? "inspection" : null;

  // A repair visit is only possible after accepting the extra-charge notice on the category page.
  if (!type || (type === "repair" && query.ack !== "1") || slug !== expected) {
    redirect({
      href:
        type && slug !== expected && (type === "inspection" || query.ack === "1")
          ? {
              pathname: "/services/[category]/book",
              params: { category: expected },
              query: type === "repair" ? { type, ack: "1" } : { type },
            }
          : { pathname: "/services/[category]", params: { category: expected } },
      locale: locale as Locale,
    });
  }

  const t = await getTranslations("booking");
  const tv = await getTranslations("visitTypes");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <Link
        href={{ pathname: "/services/[category]", params: { category: expected } }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <div className="mt-5 mb-8 flex flex-wrap items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-accent text-primary">
          <CategoryIcon name={category.icon} className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {pick(locale, category.nameBg, category.nameEn)}
            <Badge variant="secondary">{tv(type!)}</Badge>
          </p>
        </div>
      </div>
      <BookingFlow categoryId={category.id} visitType={type!} repairDisclaimerAccepted={type === "repair"} />
    </div>
  );
}
