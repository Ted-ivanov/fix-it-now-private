"use client";

import { ArrowDown, ArrowUp, Star, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  deletePhotoAction,
  reorderPhotosAction,
  setCoverAction,
  updatePhotoAction,
} from "@/server/actions/admin";

type Photo = { id: string; thumb: string; captionBg: string; captionEn: string };

/** Reorder (arrow buttons work with keyboard too), caption, set cover and delete photos. */
export function PhotoManager({
  galleryId,
  coverPhotoId,
  photos: initial,
}: {
  galleryId: string;
  coverPhotoId: string | null;
  photos: Photo[];
}) {
  const [photos, setPhotos] = useState(initial);
  const [pending, startTransition] = useTransition();

  const cover = coverPhotoId ?? photos[0]?.id;

  function move(index: number, delta: number) {
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setPhotos(next);
    startTransition(async () => {
      const r = await reorderPhotosAction(galleryId, next.map((p) => p.id));
      if (!r.ok) toast.error(r.error);
    });
  }

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        if (success) toast.success(success);
      } else toast.error(r.error ?? "Грешка");
    });

  if (photos.length === 0) {
    return <p className="rounded-xl border border-dashed bg-background p-8 text-center text-muted-foreground">Няма снимки.</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy={pending}>
      {photos.map((p, i) => (
        <li key={p.id} className={cn("flex gap-3 rounded-xl border bg-background p-3", p.id === cover && "ring-2 ring-primary")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
          <img src={p.thumb} alt="" className="size-24 shrink-0 rounded-lg object-cover" />
          <div className="grid min-w-0 flex-1 gap-2">
            <form
              className="grid gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act(
                  () => updatePhotoAction(p.id, { captionBg: String(f.get("bg")), captionEn: String(f.get("en")) }),
                  "Надписът е запазен.",
                );
              }}
            >
              <Input name="bg" defaultValue={p.captionBg} placeholder="Надпис (БГ)" aria-label="Надпис на български" className="h-8" />
              <Input name="en" defaultValue={p.captionEn} placeholder="Caption (EN)" aria-label="Надпис на английски" className="h-8" />
              <Button type="submit" size="sm" variant="secondary" className="h-7">
                Запази надписа
              </Button>
            </form>
            <div className="flex flex-wrap gap-1">
              <Button size="icon-sm" variant="ghost" aria-label="Премести напред" disabled={i === 0 || pending} onClick={() => move(i, -1)}>
                <ArrowUp className="size-4" aria-hidden />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Премести назад"
                disabled={i === photos.length - 1 || pending}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="size-4" aria-hidden />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Направи корица"
                aria-pressed={p.id === cover}
                disabled={pending}
                onClick={() => act(() => setCoverAction(galleryId, p.id), "Корицата е сменена.")}
              >
                <Star className={cn("size-4", p.id === cover && "fill-primary text-primary")} aria-hidden />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="ml-auto text-destructive"
                aria-label="Изтрий снимката"
                disabled={pending}
                onClick={() => {
                  if (!confirm("Да изтрием ли снимката?")) return;
                  setPhotos((all) => all.filter((x) => x.id !== p.id));
                  act(() => deletePhotoAction(p.id));
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
