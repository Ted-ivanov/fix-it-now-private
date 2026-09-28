import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db } from "@/server/db";
import { listCategoriesWithDurations } from "@/server/services/admin";
import { getGalleryForAdmin, photoUrls } from "@/server/services/galleries";
import { GalleryUploader } from "../../../_components/gallery-uploader";
import { PageHeader } from "../../../_components/page-header";
import { GalleryForm } from "./gallery-form";
import { PhotoManager } from "./photo-manager";

export const metadata = { title: "Галерия" };

export default async function GalleryEditPage({ params }: PageProps<"/admin/galleries/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [gallery, categories] = await Promise.all([getGalleryForAdmin(db, id), listCategoriesWithDurations(db)]);
  if (!gallery) notFound();

  return (
    <>
      <Link href="/admin/galleries" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Галерии
      </Link>
      <PageHeader
        title={gallery.titleBg}
        description={`${gallery.photos.length} снимки · ${gallery.published ? "публикувана" : "скрита"}`}
        actions={
          gallery.published && gallery.photos.length > 0 ? (
            <Button asChild variant="outline">
              <a href={`/zavarsheni-proekti/${gallery.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" aria-hidden />
                Виж на сайта
              </a>
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-8">
        <GalleryForm gallery={gallery} categories={categories.map((c) => ({ id: c.id, name: c.nameBg }))} />
        <section>
          <h2 className="mb-3 text-lg font-semibold">Снимки</h2>
          <PhotoManager
            // Remount when photos are added or removed so the list starts from the server's order.
            key={gallery.photos.map((p) => p.id).join()}
            galleryId={gallery.id}
            coverPhotoId={gallery.coverPhotoId}
            photos={gallery.photos.map((p) => ({
              id: p.id,
              thumb: photoUrls(p).thumb,
              captionBg: p.captionBg ?? "",
              captionEn: p.captionEn ?? "",
            }))}
          />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Добави още снимки</h2>
          <GalleryUploader galleries={[]} categories={[]} fixedGalleryId={gallery.id} />
        </section>
      </div>
    </>
  );
}
