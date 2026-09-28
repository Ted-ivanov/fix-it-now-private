"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { bookingDetailsSchema, MAX_BOOKING_PHOTOS, type BookingDetails } from "@/lib/booking-schema";
import { compressImage } from "@/lib/compress-image";
import { cn } from "@/lib/utils";
import { submitBooking, type BookingActionResult } from "@/server/actions/booking";
import { Turnstile, type TurnstileHandle } from "./turnstile";
import type { VisitType } from "./visit-type-picker";

export type BookingSuccess = Extract<BookingActionResult, { ok: true }>;

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function DetailsForm({
  categoryId,
  visitType,
  startAt,
  repairDisclaimerAccepted,
  onSuccess,
  onSlotTaken,
  submitLabel,
  defaultDescription = "",
}: {
  categoryId: string;
  visitType: VisitType;
  startAt: string;
  repairDisclaimerAccepted: boolean;
  onSuccess: (result: BookingSuccess) => void;
  onSlotTaken: () => void;
  submitLabel?: string;
  defaultDescription?: string;
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const form = useForm<BookingDetails>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: { customerName: "", phone: "", email: "", address: "", description: defaultDescription, consent: false as unknown as true },
  });
  const { errors, isSubmitting } = form.formState;
  const err = (key: keyof BookingDetails) => {
    const message = errors[key]?.message;
    return message ? t(`errors.${message}` as "errors.generic") : undefined;
  };

  // Free the preview URLs when the form goes away.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function removePhoto(index: number) {
    setPhotos((all) => {
      URL.revokeObjectURL(all[index].url);
      return all.filter((_, j) => j !== index);
    });
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotoError(null);
    const room = MAX_BOOKING_PHOTOS - photos.length;
    if (files.length > room) setPhotoError(t("errors.tooManyPhotos", { max: MAX_BOOKING_PHOTOS }));
    const accepted = [...files].slice(0, Math.max(0, room)).filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name));
    const compressed = await Promise.all(accepted.map((f) => compressImage(f)));
    setPhotos((current) => [...current, ...compressed.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(values: BookingDetails) {
    const data = new FormData();
    // The spam check may still be running if the form was filled in quickly: wait for it.
    const turnstileToken = await turnstileRef.current?.getToken();
    const honeypot = formRef.current ? new FormData(formRef.current).get("website") : null;
    data.set("categoryId", categoryId);
    data.set("visitType", visitType);
    data.set("startAt", startAt);
    data.set("repairDisclaimerAccepted", String(repairDisclaimerAccepted));
    data.set("locale", locale);
    for (const [key, value] of Object.entries(values)) data.set(key, String(value));
    if (turnstileToken) data.set("cf-turnstile-response", turnstileToken);
    if (typeof honeypot === "string") data.set("website", honeypot);
    for (const p of photos) data.append("photos", p.file);

    const result = await submitBooking(data);
    if (result.ok) {
      onSuccess(result);
      return;
    }
    turnstileRef.current?.reset(); // a token can only be used once
    if (result.error === "invalid" && result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof BookingDetails, { message });
      }
      return;
    }
    const message =
      result.error === "tooManyPhotos"
        ? t("errors.tooManyPhotos", { max: MAX_BOOKING_PHOTOS })
        : t(`errors.${result.error === "invalid" ? "generic" : result.error}`);
    toast.error(message);
    if (result.error === "slotTaken") onSlotTaken();
  }

  const id = (name: string) => `${uid}-${name}`;
  const described = (name: keyof BookingDetails, hasHint = false) =>
    errors[name] ? `${id(name)}-error` : hasHint ? `${id(name)}-hint` : undefined;

  return (
    <form ref={formRef} onSubmit={(e) => form.handleSubmit(onSubmit)(e)} noValidate className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id("customerName")} label={t("fields.name")} error={err("customerName")}>
          <Input
            id={id("customerName")}
            autoComplete="name"
            aria-invalid={!!errors.customerName}
            aria-describedby={described("customerName")}
            {...form.register("customerName")}
          />
        </Field>
        <Field id={id("phone")} label={t("fields.phone")} hint={t("fields.phoneHint")} error={err("phone")}>
          <Input
            id={id("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby={described("phone", true)}
            {...form.register("phone")}
          />
        </Field>
      </div>
      <Field id={id("email")} label={t("fields.email")} hint={t("fields.emailHint")} error={err("email")}>
        <Input
          id={id("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={described("email", true)}
          {...form.register("email")}
        />
      </Field>
      <Field id={id("address")} label={t("fields.address")} hint={t("fields.addressHint")} error={err("address")}>
        <Input
          id={id("address")}
          autoComplete="street-address"
          aria-invalid={!!errors.address}
          aria-describedby={described("address", true)}
          {...form.register("address")}
        />
      </Field>
      <Field
        id={id("description")}
        label={t("fields.description")}
        hint={t("fields.descriptionHint")}
        error={err("description")}
      >
        <Textarea
          id={id("description")}
          rows={4}
          aria-invalid={!!errors.description}
          aria-describedby={described("description", true)}
          {...form.register("description")}
        />
      </Field>

      <div className="grid gap-2">
        <p className="text-sm font-medium">{t("fields.photos")}</p>
        <p className="text-xs text-muted-foreground">{t("fields.photosHint", { max: MAX_BOOKING_PHOTOS })}</p>
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.url} className="relative size-20 overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL) */}
              <img src={p.url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label={t("fields.removePhoto")}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
          {photos.length < MAX_BOOKING_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="grid size-20 place-items-center rounded-lg border-2 border-dashed text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              <ImagePlus className="size-6" aria-hidden />
              <span className="sr-only">{t("fields.addPhotos")}</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />
        {photoError && (
          <p className="text-sm text-destructive" role="alert">
            {photoError}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-start gap-3">
          <Controller
            control={form.control}
            name="consent"
            render={({ field }) => (
              <Checkbox
                id={id("consent")}
                className="mt-0.5"
                aria-invalid={!!errors.consent}
                aria-describedby={described("consent")}
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          <Label htmlFor={id("consent")} className="text-sm leading-snug font-normal">
            {t.rich("fields.consent", {
              link: (chunks) => (
                <Link href="/privacy" target="_blank" className="font-medium text-primary underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </Label>
        </div>
        {errors.consent && (
          <p id={`${id("consent")}-error`} className="text-sm text-destructive" role="alert">
            {err("consent")}
          </p>
        )}
      </div>

      {/* Honeypot for bots: hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Turnstile ref={turnstileRef} />

      <Button type="submit" size="lg" disabled={isSubmitting} className={cn("h-12 text-base")}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {isSubmitting ? t("submitting") : (submitLabel ?? t("submit"))}
      </Button>
    </form>
  );
}
