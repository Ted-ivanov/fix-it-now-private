"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SlotOption } from "./use-availability";

/** Free start times as large tappable chips. */
export function SlotPicker({
  slots,
  loading,
  value,
  onChange,
  columns = "grid-cols-3 sm:grid-cols-4",
}: {
  slots: SlotOption[];
  loading: boolean;
  value: string | null;
  onChange: (slot: SlotOption) => void;
  columns?: string;
}) {
  const t = useTranslations("booking");

  if (loading) {
    return (
      <div className={cn("grid gap-2", columns)} aria-busy>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
        <span className="sr-only">{t("loading")}</span>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {t("noSlots")}
      </p>
    );
  }

  return (
    <div role="radiogroup" aria-label={t("pickTime")} className={cn("grid gap-2", columns)}>
      {slots.map((slot) => {
        const selected = slot.start === value;
        return (
          <button
            key={slot.start}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(slot)}
            className={cn(
              "h-11 rounded-lg border text-base font-medium tabular-nums transition focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:border-primary/60 hover:bg-accent",
            )}
          >
            {slot.label}
          </button>
        );
      })}
    </div>
  );
}
