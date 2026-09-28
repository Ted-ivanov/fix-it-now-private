import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { Link } from "@/i18n/navigation";
import { categorySlug, pick } from "@/lib/localized";
import type { CategoryWithDurations } from "@/server/services/catalog";

/** The four big service tiles: 2×2 on phones, one row on desktop. */
export function CategoryGrid({
  categories,
  locale,
  label,
}: {
  categories: CategoryWithDurations[];
  locale: string;
  label: string;
}) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {categories.map((c) => (
        <li key={c.id}>
          <Link
            href={{ pathname: "/services/[category]", params: { category: categorySlug(locale, c) } }}
            className="group flex h-full flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none sm:p-7"
          >
            <span className="grid size-16 place-items-center rounded-2xl bg-accent text-primary transition group-hover:bg-primary group-hover:text-primary-foreground sm:size-20">
              <CategoryIcon name={c.icon} className="size-8 sm:size-10" strokeWidth={1.75} />
            </span>
            <span className="text-base font-semibold sm:text-lg">{pick(locale, c.nameBg, c.nameEn)}</span>
            <span className="hidden text-sm text-muted-foreground sm:block">
              {pick(locale, c.descriptionBg, c.descriptionEn)}
            </span>
            <ArrowRight
              className="mt-auto size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
