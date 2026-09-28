"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { useRouter } from "@/i18n/navigation";
import { problemSuggestions, type ClientCategory } from "@/components/booking/client-category";

/** "What needs fixing?" box: typing narrows common problems; picking one starts the booking. */
export function ProblemSearch({ categories }: { categories: ClientCategory[] }) {
  const t = useTranslations("v2");
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const byKey = new Map(categories.map((c) => [c.key, c]));

  const q = query.trim().toLowerCase();
  const available = problemSuggestions.filter((s) => byKey.has(s.category));
  const matches = !q
    ? available.slice(0, 6)
    : available.filter(
        (s) =>
          t(`suggestions.${s.key}` as "suggestions.socket").toLowerCase().includes(q) ||
          s.words.some((w) => q.includes(w) || w.includes(q)),
      );

  const start = (categorySlug: string, problem?: string) =>
    router.push({ pathname: "/v2/book", query: problem ? { category: categorySlug, problem } : { category: categorySlug } });

  return (
    <div className="w-full max-w-2xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const first = matches[0];
          if (first) start(byKey.get(first.category)!.slug, t(`suggestions.${first.key}` as "suggestions.socket"));
        }}
        className="flex items-center gap-2 rounded-2xl border-2 border-primary/30 bg-background p-2 shadow-lg focus-within:border-primary"
      >
        <Search className="ml-2 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("heroTitle")}
          aria-controls={listId}
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">
          →
          <span className="sr-only">{t("heroTitle")}</span>
        </button>
      </form>

      <div id={listId} aria-live="polite" className="mt-5">
        {matches.length > 0 ? (
          <>
            {!query && <p className="mb-2 text-sm font-medium text-muted-foreground">{t("popular")}</p>}
            <ul className="flex flex-wrap gap-2">
              {matches.map((s) => {
                const category = byKey.get(s.category)!;
                const label = t(`suggestions.${s.key}` as "suggestions.socket");
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => start(category.slug, label)}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary hover:text-primary"
                    >
                      <CategoryIcon name={category.icon} className="size-4 text-primary" />
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <p className="mb-2 text-sm font-medium text-muted-foreground">{t("noMatch")}</p>
            <ul className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => start(c.slug, query.trim() || undefined)}
                    className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium hover:border-primary"
                  >
                    <CategoryIcon name={c.icon} className="size-4 text-primary" />
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
