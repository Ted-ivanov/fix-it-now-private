"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteGalleryAction, updateGalleryAction } from "@/server/actions/admin";

type Gallery = {
  id: string;
  titleBg: string;
  titleEn: string | null;
  descriptionBg: string | null;
  descriptionEn: string | null;
  categoryId: string | null;
  published: boolean;
};

export function GalleryForm({ gallery, categories }: { gallery: Gallery; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await updateGalleryAction(gallery.id, {
        titleBg: String(f.get("titleBg")),
        titleEn: String(f.get("titleEn")),
        descriptionBg: String(f.get("descriptionBg")),
        descriptionEn: String(f.get("descriptionEn")),
        categoryId: String(f.get("categoryId")) || null,
        published: f.get("published") === "on",
      });
      if (r.ok) toast.success("Запазено.");
      else toast.error(r.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border bg-background p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="titleBg">Заглавие (български)</Label>
          <Input id="titleBg" name="titleBg" defaultValue={gallery.titleBg} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="titleEn">Заглавие (английски)</Label>
          <Input id="titleEn" name="titleEn" defaultValue={gallery.titleEn ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="descriptionBg">Описание (български)</Label>
          <Textarea id="descriptionBg" name="descriptionBg" rows={3} defaultValue={gallery.descriptionBg ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="descriptionEn">Описание (английски)</Label>
          <Textarea id="descriptionEn" name="descriptionEn" rows={3} defaultValue={gallery.descriptionEn ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="categoryId">Услуга</Label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={gallery.categoryId ?? ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">— без —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-3 self-end pb-2 text-sm font-medium">
          <Switch name="published" defaultChecked={gallery.published} />
          Публикувана на сайта
        </label>
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Запази
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" className="text-destructive">
              <Trash2 className="size-4" aria-hidden />
              Изтрий галерията
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Да изтрием ли галерията?</AlertDialogTitle>
              <AlertDialogDescription>Всички снимки в нея ще бъдат изтрити окончателно.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Назад</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  startTransition(async () => {
                    const r = await deleteGalleryAction(gallery.id);
                    if (r.ok) router.replace("/admin/galleries");
                    else toast.error(r.error);
                  })
                }
              >
                Изтрий
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </form>
  );
}
