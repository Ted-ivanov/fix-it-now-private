import { db } from "@/server/db";
import { listCategoriesWithDurations } from "@/server/services/admin";
import { listAllGalleries } from "@/server/services/galleries";
import { GalleryUploader } from "../../../_components/gallery-uploader";
import { PageHeader } from "../../../_components/page-header";

export const metadata = { title: "Качване на снимки" };

export default async function UploadPage() {
  const [galleries, categories] = await Promise.all([listAllGalleries(db), listCategoriesWithDurations(db)]);
  return (
    <>
      <PageHeader
        title="Качване на снимки"
        description="Снимките се оразмеряват автоматично, а данните за местоположение (GPS) се премахват."
      />
      <GalleryUploader
        galleries={galleries.map((g) => ({ id: g.gallery.id, title: g.gallery.titleBg, photoCount: g.photoCount }))}
        categories={categories.map((c) => ({ id: c.id, name: c.nameBg }))}
      />
    </>
  );
}
