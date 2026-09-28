import type { Locale } from "@/i18n/routing";

/** Picks the English text when viewing in English and it exists, otherwise the Bulgarian one. */
export function pick(locale: Locale | string, bg: string, en: string | null | undefined): string;
export function pick(
  locale: Locale | string,
  bg: string | null | undefined,
  en: string | null | undefined,
): string | null;
export function pick(locale: string, bg: string | null | undefined, en: string | null | undefined) {
  return locale === "en" && en?.trim() ? en : (bg ?? null);
}

export function categorySlug(locale: string, c: { slugBg: string; slugEn: string }) {
  return locale === "en" ? c.slugEn : c.slugBg;
}
