import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { site } from "@/lib/site";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";
import { listPublishedGalleries } from "@/server/services/galleries";

type Href = Parameters<typeof getPathname>[0]["href"];

function entry(href: (locale: Locale) => Href, lastModified?: Date): MetadataRoute.Sitemap[number] {
  const url = (locale: Locale) => site.url + getPathname({ href: href(locale), locale });
  return {
    url: url(routing.defaultLocale),
    lastModified,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, url(l)])) },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [categories, galleries] = await Promise.all([getCatalog(db), listPublishedGalleries(db)]);
  return [
    entry(() => "/"),
    ...categories.map((c) =>
      entry((l) => ({ pathname: "/services/[category]", params: { category: l === "en" ? c.slugEn : c.slugBg } })),
    ),
    entry(() => "/our-work"),
    ...galleries.map(({ gallery }) =>
      entry(() => ({ pathname: "/our-work/[slug]", params: { slug: gallery.slug } }), gallery.updatedAt),
    ),
    entry(() => "/privacy"),
    entry(() => "/terms"),
  ];
}
