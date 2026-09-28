import { categorySlug, pick } from "@/lib/localized";
import type { CategoryWithDurations } from "@/server/services/catalog";

/** A category already translated for the current language, safe to pass to client components. */
export type ClientCategory = {
  id: string;
  /** Stable key (the English slug), used to match problem suggestions. */
  key: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  durations: { inspection: number | null; repair: number | null };
};

export function toClientCategories(catalog: CategoryWithDurations[], locale: string): ClientCategory[] {
  return catalog.map((c) => ({
    id: c.id,
    key: c.slugEn,
    slug: categorySlug(locale, c),
    name: pick(locale, c.nameBg, c.nameEn),
    description: pick(locale, c.descriptionBg, c.descriptionEn),
    icon: c.icon,
    durations: c.durations,
  }));
}

/** Common problems for the V2 search box, mapped to the category that handles them. */
export const problemSuggestions: { key: string; category: string; words: string[] }[] = [
  { key: "socket", category: "electrical", words: ["контакт", "socket", "outlet", "ток", "power"] },
  { key: "lights", category: "electrical", words: ["осветление", "лампа", "полилей", "light", "lamp"] },
  { key: "fuse", category: "electrical", words: ["бушон", "табло", "предпазител", "fuse", "breaker"] },
  { key: "leak", category: "plumbing", words: ["тече", "теч", "кран", "смесител", "сифон", "leak", "tap", "faucet"] },
  { key: "boiler", category: "plumbing", words: ["бойлер", "топла вода", "heater", "boiler"] },
  { key: "drain", category: "plumbing", words: ["запуш", "канал", "мивка", "тоалет", "drain", "clog", "toilet"] },
  { key: "paint", category: "interior-finishing", words: ["боядис", "боя", "стена", "paint", "wall"] },
  { key: "tiles", category: "interior-finishing", words: ["плочк", "фаянс", "теракот", "tile"] },
  { key: "drywall", category: "interior-finishing", words: ["гипсокартон", "шпаклов", "мазилка", "drywall", "plaster"] },
  { key: "furniture", category: "other-repairs", words: ["мебел", "гардероб", "сглоб", "furniture", "assembl"] },
  { key: "door", category: "other-repairs", words: ["врата", "брава", "панта", "door", "lock", "hinge"] },
  { key: "shelves", category: "other-repairs", words: ["рафт", "корниз", "телевизор", "shelf", "shelves", "tv", "mount"] },
];
