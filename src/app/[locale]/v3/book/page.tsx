import { ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookingFlow } from "@/components/booking/booking-flow";
import { toClientCategories } from "@/components/booking/client-category";
import { CategoryIcon } from "@/components/category-icon";
import { Link } from "@/i18n/navigation";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";
import { V3VisitChoice } from "./visit-choice";

/** V3 keeps the classic step-by-step flow, all on one URL: service → visit → date/time → details. */
export default async function V3Book({ params, searchParams }: PageProps<"/[locale]/v3/book">) {
  const { locale } = await params;
  const q = await searchParams;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations();
  const categories = toClientCategories(await getCatalog(db), locale);
  const category = categories.find((c) => c.slug === q.category || c.key === q.category);
  const type = q.type === "inspection" || (q.type === "repair" && q.ack === "1") ? q.type : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">{t("booking.title")}</h1>

      {!category ? (
        <>
          <h2 className="mt-8 mb-4 text-xl font-semibold">{t("home.categoriesLabel")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={{ pathname: "/v3/book", query: { category: c.slug } }}
                  className="flex items-center gap-4 rounded-xl border bg-card p-5 transition hover:border-primary hover:shadow-sm"
                >
                  <CategoryIcon name={c.icon} className="size-8 text-primary" />
                  <span>
                    <span className="block font-semibold">{c.name}</span>
                    <span className="block text-sm text-muted-foreground">{c.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="mt-6 mb-8 flex flex-wrap items-center gap-3">
            <Link
              href={type ? { pathname: "/v3/book", query: { category: category.slug } } : "/v3/book"}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              {t("booking.back")}
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
              <CategoryIcon name={category.icon} className="size-4" />
              {category.name}
              {type && ` · ${t(`visitTypes.${type}`)}`}
            </span>
          </div>
          {!type ? (
            <>
              <h2 className="mb-4 text-xl font-semibold">{t("category.chooseVisit")}</h2>
              <V3VisitChoice category={category.slug} durations={category.durations} />
            </>
          ) : (
            <BookingFlow categoryId={category.id} visitType={type} repairDisclaimerAccepted={type === "repair"} homeHref="/v3" />
          )}
        </>
      )}
    </div>
  );
}
