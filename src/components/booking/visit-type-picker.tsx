"use client";

import { ClipboardCheck, Clock, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type VisitType = "inspection" | "repair";

export function useDurationLabel() {
  const t = useTranslations("category");
  return (minutes: number | null) => {
    if (!minutes) return null;
    return minutes > 60 && minutes % 60 === 0
      ? t("durationHours", { hours: minutes / 60 })
      : t("duration", { minutes });
  };
}

/**
 * The two visit options. Choosing "repair" first shows the extra-charge notice; the customer
 * can accept it or switch to an inspection. `onChoose` receives the final choice.
 */
export function VisitTypePicker({
  durations,
  onChoose,
  compact = false,
}: {
  durations: { inspection: number | null; repair: number | null };
  onChoose: (type: VisitType) => void;
  compact?: boolean;
}) {
  const t = useTranslations("category");
  const td = useTranslations("disclaimer");
  const durationLabel = useDurationLabel();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const options = [
    { type: "inspection" as const, icon: ClipboardCheck },
    { type: "repair" as const, icon: Wrench },
  ];

  return (
    <>
      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2 sm:gap-6")}>
        {options.map(({ type, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => (type === "repair" ? setConfirmOpen(true) : onChoose("inspection"))}
            className={cn(
              "group flex w-full items-start gap-4 rounded-2xl border bg-card text-left shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none",
              compact ? "p-4" : "p-6 sm:flex-col sm:gap-5 sm:p-8",
            )}
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary transition group-hover:bg-primary group-hover:text-primary-foreground sm:size-14">
              <Icon className="size-6 sm:size-7" aria-hidden />
            </span>
            <span className="flex flex-1 flex-col gap-2">
              <span className="text-lg font-semibold sm:text-xl">{t(`${type}.title`)}</span>
              <span className="text-sm text-muted-foreground sm:text-base">{t(`${type}.description`)}</span>
              {!compact && <span className="text-sm font-medium">{t(`${type}.bestFor`)}</span>}
              {durations[type] && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-4" aria-hidden />
                  {durationLabel(durations[type])}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{td("title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">{td("body")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onChoose("inspection")}>
              {td("switchToInspection")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => onChoose("repair")}>{td("accept")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
