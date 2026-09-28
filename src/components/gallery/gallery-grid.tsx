import { Images } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pick } from "@/lib/localized";
import type { listPublishedGalleries } from "@/server/services/galleries";
import { photoUrls } from "@/server/services/galleries";

type Item = Awaited<ReturnType<typeof listPublishedGalleries>>[number];

/** Cards linking to each published gallery, with its cover photo. */
export async function GalleryGrid({ items, locale }: { items: Item[]; locale: string }) {
  const t = await getTranslations("ourWork");
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ gallery, category, photoCount, cover }) => (
        <li key={gallery.id}>
          <Link
            href={{ pathname: "/our-work/[slug]", params: { slug: gallery.slug } }}
            className="group block overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              {cover && (
                <Image
                  src={photoUrls(cover).thumb}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  placeholder="blur"
                  blurDataURL={cover.blurDataUrl}
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              )}
            </div>
            <div className="grid gap-1 p-4">
              <h2 className="font-semibold">{pick(locale, gallery.titleBg, gallery.titleEn)}</h2>
              <p className="flex items-center gap-3 text-sm text-muted-foreground">
                {category && <span>{pick(locale, category.nameBg, category.nameEn)}</span>}
                <span className="inline-flex items-center gap-1">
                  <Images className="size-3.5" aria-hidden />
                  {t("photos", { count: photoCount })}
                </span>
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
