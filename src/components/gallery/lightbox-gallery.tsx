"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type LightboxPhoto = {
  id: string;
  thumb: string;
  large: string;
  width: number;
  height: number;
  blurDataUrl: string;
  caption: string | null;
};

/** Photo grid; clicking a photo opens it large with previous/next (arrow keys work too). */
export function LightboxGallery({ photos, title }: { photos: LightboxPhoto[]; title: string }) {
  const t = useTranslations("ourWork");
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const current = index !== null ? photos[index] : null;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>li]:mb-3">
        {photos.map((photo, i) => (
          <li key={photo.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group block w-full overflow-hidden rounded-xl bg-muted focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none"
              aria-label={photo.caption ?? t("photoOf", { index: i + 1, total: photos.length })}
            >
              <Image
                src={photo.thumb}
                alt={photo.caption ?? ""}
                width={photo.width}
                height={photo.height}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                placeholder="blur"
                blurDataURL={photo.blurDataUrl}
                className="h-auto w-full transition duration-300 group-hover:scale-[1.03]"
              />
            </button>
            {photo.caption && <p className="mt-1.5 text-sm text-muted-foreground">{photo.caption}</p>}
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent
          className="max-h-[95vh] w-[min(96vw,1400px)] max-w-none border-0 bg-black/95 p-2 text-white sm:max-w-none sm:p-4"
          closeLabel={t("close")}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {index !== null && t("photoOf", { index: index + 1, total: photos.length })}
          </DialogDescription>
          {current && (
            <figure className="flex flex-col items-center gap-3">
              <div className="relative flex max-h-[80vh] w-full items-center justify-center">
                <Image
                  key={current.id}
                  src={current.large}
                  alt={current.caption ?? ""}
                  width={current.width}
                  height={current.height}
                  placeholder="blur"
                  blurDataURL={current.blurDataUrl}
                  className="max-h-[80vh] w-auto rounded-lg object-contain"
                  sizes="96vw"
                />
              </div>
              <figcaption className="flex w-full items-center justify-between gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                  aria-label={t("previous")}
                >
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <span className="text-center text-white/80">
                  {current.caption && <span className="block text-white">{current.caption}</span>}
                  {t("photoOf", { index: (index ?? 0) + 1, total: photos.length })}
                </span>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                  aria-label={t("next")}
                >
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </figcaption>
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
