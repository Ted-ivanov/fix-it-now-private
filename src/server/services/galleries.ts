import { and, asc, count, desc, eq, inArray, like, max, or } from "drizzle-orm";
import type { Db } from "@/server/db";
import { gallery, galleryPhoto, serviceCategory } from "@/server/db/schema";
import { deleteObjects, getObject, publicUrl, putObject } from "@/server/storage";
import { slugify } from "@/lib/slug";
import { processGalleryImage } from "./images";

export type Gallery = typeof gallery.$inferSelect;
export type GalleryPhoto = typeof galleryPhoto.$inferSelect;

export function photoUrls(photo: Pick<GalleryPhoto, "largeKey" | "thumbKey">) {
  return { large: publicUrl(photo.largeKey), thumb: publicUrl(photo.thumbKey) };
}

// ---------------------------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------------------------

/** Published galleries with a cover photo and photo count, newest first. */
export async function listPublishedGalleries(db: Db, opts: { categoryId?: string; limit?: number } = {}) {
  const rows = await db
    .select({
      gallery,
      category: {
        id: serviceCategory.id,
        nameBg: serviceCategory.nameBg,
        nameEn: serviceCategory.nameEn,
        slugBg: serviceCategory.slugBg,
      },
      photoCount: count(galleryPhoto.id),
    })
    .from(gallery)
    .leftJoin(serviceCategory, eq(serviceCategory.id, gallery.categoryId))
    .innerJoin(galleryPhoto, eq(galleryPhoto.galleryId, gallery.id))
    .where(
      and(
        eq(gallery.published, true),
        opts.categoryId ? eq(gallery.categoryId, opts.categoryId) : undefined,
      ),
    )
    .groupBy(gallery.id, serviceCategory.id)
    .orderBy(desc(gallery.createdAt))
    .limit(opts.limit ?? 100);

  const covers = await coverPhotos(db, rows.map((r) => r.gallery));
  return rows.map((r) => ({ ...r, cover: covers.get(r.gallery.id) ?? null }));
}

/** The chosen cover, or the first photo when none is set. */
async function coverPhotos(db: Db, galleries: Gallery[]) {
  const result = new Map<string, GalleryPhoto>();
  if (galleries.length === 0) return result;
  const photos = await db
    .select()
    .from(galleryPhoto)
    .where(inArray(galleryPhoto.galleryId, galleries.map((g) => g.id)))
    .orderBy(asc(galleryPhoto.sort), asc(galleryPhoto.createdAt));
  for (const g of galleries) {
    const own = photos.filter((p) => p.galleryId === g.id);
    const cover = own.find((p) => p.id === g.coverPhotoId) ?? own[0];
    if (cover) result.set(g.id, cover);
  }
  return result;
}

export async function getPublishedGallery(db: Db, slug: string) {
  const row = await db.query.gallery.findFirst({
    where: and(eq(gallery.slug, slug), eq(gallery.published, true)),
    with: {
      category: true,
      photos: { orderBy: [asc(galleryPhoto.sort), asc(galleryPhoto.createdAt)] },
    },
  });
  return row && row.photos.length > 0 ? row : null;
}

/** Latest published photos across galleries (for "before/after" strips on the home page). */
export async function latestPhotos(db: Db, limit = 8) {
  return db
    .select({ photo: galleryPhoto, slug: gallery.slug, titleBg: gallery.titleBg, titleEn: gallery.titleEn })
    .from(galleryPhoto)
    .innerJoin(gallery, eq(gallery.id, galleryPhoto.galleryId))
    .where(eq(gallery.published, true))
    .orderBy(desc(galleryPhoto.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------------------------

export async function listAllGalleries(db: Db) {
  const rows = await db
    .select({ gallery, photoCount: count(galleryPhoto.id) })
    .from(gallery)
    .leftJoin(galleryPhoto, eq(galleryPhoto.galleryId, gallery.id))
    .groupBy(gallery.id)
    .orderBy(desc(gallery.updatedAt));
  const covers = await coverPhotos(db, rows.map((r) => r.gallery));
  return rows.map((r) => ({ ...r, cover: covers.get(r.gallery.id) ?? null }));
}

export async function getGalleryForAdmin(db: Db, id: string) {
  return db.query.gallery.findFirst({
    where: eq(gallery.id, id),
    with: { photos: { orderBy: [asc(galleryPhoto.sort), asc(galleryPhoto.createdAt)] } },
  });
}

async function uniqueSlug(db: Db, title: string) {
  const base = slugify(title);
  const taken = new Set(
    (
      await db
        .select({ slug: gallery.slug })
        .from(gallery)
        .where(or(eq(gallery.slug, base), like(gallery.slug, `${base}-%`)))
    ).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export type GalleryInput = {
  titleBg: string;
  titleEn?: string | null;
  descriptionBg?: string | null;
  descriptionEn?: string | null;
  categoryId?: string | null;
  published?: boolean;
};

export async function createGallery(db: Db, input: GalleryInput) {
  const [created] = await db
    .insert(gallery)
    .values({ ...input, slug: await uniqueSlug(db, input.titleBg) })
    .returning();
  return created;
}

export async function updateGallery(db: Db, id: string, input: Partial<GalleryInput>) {
  const [updated] = await db.update(gallery).set(input).where(eq(gallery.id, id)).returning();
  return updated;
}

export async function setCover(db: Db, galleryId: string, photoId: string) {
  const [photo] = await db
    .select({ id: galleryPhoto.id })
    .from(galleryPhoto)
    .where(and(eq(galleryPhoto.id, photoId), eq(galleryPhoto.galleryId, galleryId)));
  if (!photo) throw new Error("Photo is not in this gallery");
  await db.update(gallery).set({ coverPhotoId: photoId }).where(eq(gallery.id, galleryId));
}

export async function deleteGallery(db: Db, id: string) {
  const photos = await db.select().from(galleryPhoto).where(eq(galleryPhoto.galleryId, id));
  await db.delete(gallery).where(eq(gallery.id, id));
  await deleteObjects("public", photos.flatMap((p) => [p.largeKey, p.thumbKey]));
}

/**
 * Takes an original the browser uploaded to the private bucket, stores web versions in the
 * public bucket, adds the photo to the end of the gallery and removes the original.
 */
export async function addPhotoFromUpload(db: Db, galleryId: string, uploadKey: string) {
  if (!uploadKey.startsWith("uploads/")) throw new Error("Invalid upload key");
  const original = await getObject("private", uploadKey);
  try {
    const img = await processGalleryImage(original);
    const photoId = crypto.randomUUID();
    const largeKey = `galleries/${galleryId}/${photoId}-lg.webp`;
    const thumbKey = `galleries/${galleryId}/${photoId}-sm.webp`;
    await putObject("public", largeKey, img.large, "image/webp");
    await putObject("public", thumbKey, img.thumb, "image/webp");

    const [{ last }] = await db
      .select({ last: max(galleryPhoto.sort) })
      .from(galleryPhoto)
      .where(eq(galleryPhoto.galleryId, galleryId));
    const [photo] = await db
      .insert(galleryPhoto)
      .values({
        id: photoId,
        galleryId,
        largeKey,
        thumbKey,
        width: img.width,
        height: img.height,
        blurDataUrl: img.blurDataUrl,
        takenAt: img.takenAt,
        sort: (last ?? -1) + 1,
      })
      .returning();
    await db.update(gallery).set({ updatedAt: new Date() }).where(eq(gallery.id, galleryId));
    return photo;
  } finally {
    await deleteObjects("private", [uploadKey]);
  }
}

export async function updatePhoto(
  db: Db,
  photoId: string,
  input: { captionBg?: string | null; captionEn?: string | null },
) {
  await db.update(galleryPhoto).set(input).where(eq(galleryPhoto.id, photoId));
}

export async function deletePhoto(db: Db, photoId: string) {
  const [photo] = await db.delete(galleryPhoto).where(eq(galleryPhoto.id, photoId)).returning();
  if (!photo) return;
  await db
    .update(gallery)
    .set({ coverPhotoId: null })
    .where(and(eq(gallery.id, photo.galleryId), eq(gallery.coverPhotoId, photoId)));
  await deleteObjects("public", [photo.largeKey, photo.thumbKey]);
}

export async function reorderPhotos(db: Db, galleryId: string, orderedIds: string[]) {
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(galleryPhoto)
        .set({ sort: index })
        .where(and(eq(galleryPhoto.id, id), eq(galleryPhoto.galleryId, galleryId)));
    }
  });
}
