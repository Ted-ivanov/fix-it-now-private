import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LightboxGallery } from "@/components/gallery/lightbox-gallery";
import { Link } from "@/i18n/navigation";
import { pick } from "@/lib/localized";
import { db } from "@/server/db";
import { getPublishedGallery, photoUrls } from "@/server/services/galleries";

export async function generateMetadata({ params }: PageProps<"/[locale]/our-work/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const gallery = await getPublishedGallery(db, slug);
  if (!gallery) return {};
  const cover = gallery.photos.find((p) => p.id === gallery.coverPhotoId) ?? gallery.photos[0];
  return {
    title: pick(locale, gallery.titleBg, gallery.titleEn),
    description: pick(locale, gallery.descriptionBg, gallery.descriptionEn) ?? undefined,
    openGraph: { images: [{ url: photoUrls(cover).large, width: cover.width, height: cover.height }] },
  };
}

export default async function GalleryPage({ params }: PageProps<"/[locale]/our-work/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  await connection();
  const gallery = await getPublishedGallery(db, slug);
  if (!gallery) notFound();
  const t = await getTranslations("ourWork");
  const title = pick(locale, gallery.titleBg, gallery.titleEn);
  const description = pick(locale, gallery.descriptionBg, gallery.descriptionEn);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <Link href="/our-work" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">
        {gallery.category && pick(locale, gallery.category.nameBg, gallery.category.nameEn)}
        {gallery.category && " · "}
        {t("photos", { count: gallery.photos.length })}
      </p>
      {description && <p className="mt-4 max-w-3xl text-lg whitespace-pre-line">{description}</p>}
      <div className="mt-8">
        <LightboxGallery
          title={title}
          photos={gallery.photos.map((p) => ({
            id: p.id,
            ...photoUrls(p),
            width: p.width,
            height: p.height,
            blurDataUrl: p.blurDataUrl,
            caption: pick(locale, p.captionBg, p.captionEn),
          }))}
        />
      </div>
    </div>
  );
}
