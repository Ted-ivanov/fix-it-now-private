"use client";

import { Check, ChevronsUpDown, CircleAlert, ImageUp, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createGalleryAction, createUploadUrlsAction, processUploadAction } from "@/server/actions/admin";

type GalleryOption = { id: string; title: string; photoCount: number };
type CategoryOption = { id: string; name: string };

type Item = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  state: "waiting" | "uploading" | "processing" | "done" | "error";
  error?: string;
};

const CONCURRENCY = 3;

function putWithProgress(url: string, file: File, contentType: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

/**
 * Upload photos into an existing gallery or a new one. Originals go straight from the browser
 * to storage; the server then makes the web versions and removes GPS/metadata.
 */
export function GalleryUploader({
  galleries,
  categories,
  fixedGalleryId,
}: {
  galleries: GalleryOption[];
  categories: CategoryOption[];
  /** When set (on a gallery's own page) the photos always go into that gallery. */
  fixedGalleryId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"existing" | "new">(fixedGalleryId || galleries.length > 0 ? "existing" : "new");
  const [galleryId, setGalleryId] = useState<string | null>(fixedGalleryId ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newGallery, setNewGallery] = useState({ titleBg: "", titleEn: "", categoryId: "", published: true });
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [doneGalleryId, setDoneGalleryId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((all) => all.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  function addFiles(files: FileList | File[]) {
    const images = [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (images.length < [...files].length) toast.warning("Някои файлове не са снимки и бяха пропуснати.");
    setDoneGalleryId(null);
    setItems((all) => [
      ...all,
      ...images.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        state: "waiting" as const,
      })),
    ]);
  }

  async function start() {
    const queue = items.filter((i) => i.state === "waiting" || i.state === "error");
    if (queue.length === 0) return;

    let target = fixedGalleryId ?? (mode === "existing" ? galleryId : null);
    if (!target && mode === "existing") {
      toast.error("Изберете галерия.");
      return;
    }
    setRunning(true);
    try {
      if (!target) {
        if (!newGallery.titleBg.trim()) {
          toast.error("Въведете заглавие на галерията.");
          return;
        }
        const created = await createGalleryAction({
          titleBg: newGallery.titleBg,
          titleEn: newGallery.titleEn,
          categoryId: newGallery.categoryId || null,
          published: newGallery.published,
        });
        target = created.id;
        // Further uploads in this session go to the gallery just created.
        setMode("existing");
        setGalleryId(created.id);
      }

      const urls = await createUploadUrlsAction(queue.map((i) => ({ name: i.file.name, type: i.file.type, size: i.file.size })));
      const jobs = queue.map((item, index) => async () => {
        const { key, url, contentType } = urls[index];
        try {
          update(item.id, { state: "uploading", progress: 0, error: undefined });
          await putWithProgress(url, item.file, contentType, (progress) => update(item.id, { progress }));
          update(item.id, { state: "processing", progress: 100 });
          const result = await processUploadAction(target!, key);
          update(item.id, result.ok ? { state: "done" } : { state: "error", error: result.error });
        } catch {
          update(item.id, { state: "error", error: "Качването не успя. Проверете връзката." });
        }
      });

      // A few uploads at a time: fast, without overloading a phone connection.
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        for (let job = jobs.shift(); job; job = jobs.shift()) await job();
      });
      await Promise.all(workers);
      setDoneGalleryId(target);
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  const selected = galleries.find((g) => g.id === galleryId);
  const waiting = items.filter((i) => i.state === "waiting" || i.state === "error").length;
  const done = items.filter((i) => i.state === "done").length;

  return (
    <div className="grid gap-6">
      {!fixedGalleryId && (
        <fieldset className="grid gap-4 rounded-xl border bg-background p-5">
          <legend className="px-1 font-semibold">Къде да отидат снимките?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["existing", "Добави към съществуваща галерия"],
                ["new", "Създай нова галерия"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-medium",
                  mode === value ? "border-primary bg-accent" : "hover:bg-muted",
                  value === "existing" && galleries.length === 0 && "pointer-events-none opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  disabled={value === "existing" && galleries.length === 0}
                  className="accent-(--primary)"
                />
                {label}
              </label>
            ))}
          </div>

          {mode === "existing" ? (
            <div className="grid gap-1.5">
              <Label id="gallery-picker-label">Галерия</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    aria-labelledby="gallery-picker-label"
                    className="w-full justify-between font-normal sm:w-96"
                  >
                    {selected ? selected.title : "Изберете галерия…"}
                    <ChevronsUpDown className="size-4 opacity-50" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Търсене…" />
                    <CommandList>
                      <CommandEmpty>Няма такава галерия.</CommandEmpty>
                      <CommandGroup>
                        {galleries.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={`${g.title} ${g.id}`}
                            onSelect={() => {
                              setGalleryId(g.id);
                              setPickerOpen(false);
                            }}
                          >
                            <Check className={cn("size-4", g.id === galleryId ? "opacity-100" : "opacity-0")} aria-hidden />
                            <span className="flex-1">{g.title}</span>
                            <span className="text-xs text-muted-foreground">{g.photoCount} снимки</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="titleBg">Заглавие (български) *</Label>
                <Input
                  id="titleBg"
                  value={newGallery.titleBg}
                  placeholder="напр. Ремонт на баня, Младост"
                  onChange={(e) => setNewGallery((g) => ({ ...g, titleBg: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="titleEn">Заглавие (английски)</Label>
                <Input
                  id="titleEn"
                  value={newGallery.titleEn}
                  placeholder="e.g. Bathroom renovation, Mladost"
                  onChange={(e) => setNewGallery((g) => ({ ...g, titleEn: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="category">Услуга</Label>
                <select
                  id="category"
                  value={newGallery.categoryId}
                  onChange={(e) => setNewGallery((g) => ({ ...g, categoryId: e.target.value }))}
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
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <Checkbox
                  checked={newGallery.published}
                  onCheckedChange={(v) => setNewGallery((g) => ({ ...g, published: v === true }))}
                />
                Публикувай веднага на сайта
              </label>
            </div>
          )}
        </fieldset>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "grid place-items-center gap-3 rounded-xl border-2 border-dashed bg-background p-10 text-center transition",
          dragging && "border-primary bg-accent",
        )}
      >
        <ImageUp className="size-10 text-primary" aria-hidden />
        <p className="font-medium">Пуснете снимките тук</p>
        <p className="text-sm text-muted-foreground">или</p>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          Изберете файлове
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP, HEIC · до 40 MB на снимка</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="grid gap-4">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((it) => (
              <li key={it.id} className="overflow-hidden rounded-lg border bg-background">
                <div className="relative aspect-square bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={it.preview} alt="" className="size-full object-cover" />
                  {it.state === "waiting" && !running && (
                    <button
                      type="button"
                      aria-label="Премахни"
                      onClick={() => {
                        URL.revokeObjectURL(it.preview);
                        setItems((all) => all.filter((x) => x.id !== it.id));
                      }}
                      className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                  {it.state === "done" && (
                    <span className="absolute inset-0 grid place-items-center bg-black/30">
                      <Check className="size-8 text-white" aria-label="Готово" />
                    </span>
                  )}
                </div>
                <div className="grid gap-1.5 p-2">
                  <p className="truncate text-xs">{it.file.name}</p>
                  {(it.state === "uploading" || it.state === "processing") && (
                    <>
                      <Progress value={it.progress} aria-label={`Качване на ${it.file.name}`} />
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                        {it.state === "uploading" ? `${it.progress}%` : "Обработка…"}
                      </p>
                    </>
                  )}
                  {it.state === "error" && (
                    <p className="flex items-start gap-1 text-xs text-destructive">
                      <CircleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                      {it.error}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={start} disabled={running || waiting === 0} size="lg">
              {running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
              {running ? "Качване…" : waiting === 0 ? "Качи снимки" : `Качи ${waiting} ${waiting === 1 ? "снимка" : "снимки"}`}
            </Button>
            <p className="text-sm text-muted-foreground" role="status">
              {done > 0 && `${done} от ${items.length} готови.`}
            </p>
            {doneGalleryId && !fixedGalleryId && (
              <Button asChild variant="outline">
                <Link href={`/admin/galleries/${doneGalleryId}`}>Отвори галерията</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
