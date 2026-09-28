"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { bg, enGB } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { fromDayString, toDayString, toMonthString, useBookableDays } from "./use-availability";
import type { VisitType } from "./visit-type-picker";

/** Month calendar where only days with free slots can be picked. */
export function BookingDatePicker({
  categoryId,
  visitType,
  value,
  onChange,
  className,
}: {
  categoryId: string;
  visitType: VisitType;
  value: string | null;
  onChange: (day: string) => void;
  className?: string;
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const today = new Date();
  const [month, setMonth] = useState(() => (value ? fromDayString(value) : today));
  const { days, loading, error } = useBookableDays(categoryId, visitType, toMonthString(month));
  const available = new Set(days);

  return (
    <div className={cn("relative", className)} aria-busy={loading}>
      <Calendar
        mode="single"
        locale={locale === "bg" ? bg : enGB}
        weekStartsOn={1}
        month={month}
        onMonthChange={setMonth}
        startMonth={new Date(today.getFullYear(), today.getMonth(), 1)}
        endMonth={new Date(today.getFullYear(), today.getMonth() + 2, 1)}
        selected={value ? fromDayString(value) : undefined}
        onSelect={(date) => date && onChange(toDayString(date))}
        disabled={(date) => loading || !available.has(toDayString(date))}
        modifiers={{ bookable: (date) => available.has(toDayString(date)) }}
        modifiersClassNames={{
          bookable:
            "[&_button]:bg-accent [&_button]:font-semibold [&_button]:text-accent-foreground [&_button:hover]:bg-primary/15",
        }}
        showOutsideDays={false}
        className="w-full rounded-xl border p-3 [--cell-size:--spacing(10)] sm:[--cell-size:--spacing(11)]"
        classNames={{ root: "w-full", month: "w-full flex flex-col gap-4" }}
      />
      {!loading && (error || days.length === 0) && (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {error ? t("errors.generic") : t("noDays")}
        </p>
      )}
    </div>
  );
}
