"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BookingDatePicker } from "./date-picker";
import { DetailsForm, type BookingSuccess as Result } from "./details-form";
import { BookingSuccess } from "./booking-success";
import { SlotPicker } from "./slot-picker";
import { fromDayString, useSlots, type SlotOption } from "./use-availability";
import type { VisitType } from "./visit-type-picker";

/** Shared state for every booking layout: chosen day, chosen slot and the final result. */
export function useBookingState(categoryId: string, visitType: VisitType) {
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotOption | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const slots = useSlots(categoryId, visitType, day, reloadKey);
  return {
    day,
    slot,
    slots,
    result,
    pickDay(next: string) {
      setDay(next);
      setSlot(null);
    },
    pickSlot: setSlot,
    /** The chosen time was taken by someone else: drop it and reload the times. */
    slotTaken() {
      setSlot(null);
      setReloadKey((k) => k + 1);
    },
    finish: setResult,
    reset() {
      setDay(null);
      setSlot(null);
      setResult(null);
    },
  };
}

function StepHeading({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-semibold">
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full text-sm font-bold",
          done ? "bg-primary text-primary-foreground" : "bg-accent text-primary",
        )}
      >
        {n}
      </span>
      {title}
    </h2>
  );
}

/** Main design: date and time side by side, then the details form, on one page. */
export function BookingFlow({
  categoryId,
  visitType,
  repairDisclaimerAccepted,
  homeHref = "/",
}: {
  categoryId: string;
  visitType: VisitType;
  repairDisclaimerAccepted: boolean;
  homeHref?: "/" | "/v2" | "/v3" | "/v4";
}) {
  const t = useTranslations("booking");
  const format = useFormatter();
  const state = useBookingState(categoryId, visitType);
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.slot) detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.slot]);

  if (state.result) return <BookingSuccess result={state.result} homeHref={homeHref} />;

  return (
    <div className="grid gap-8">
      <section className="grid gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <StepHeading n={1} title={`${t("pickDate")} · ${t("pickTime")}`} done={!!state.slot} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <BookingDatePicker
            categoryId={categoryId}
            visitType={visitType}
            value={state.day}
            onChange={state.pickDay}
          />
          <div className="grid content-start gap-3">
            {state.day ? (
              <>
                <p className="font-medium">
                  {format.dateTime(fromDayString(state.day), { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <SlotPicker
                  slots={state.slots.slots}
                  loading={state.slots.loading}
                  value={state.slot?.start ?? null}
                  onChange={state.pickSlot}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("pickDate")}…</p>
            )}
          </div>
        </div>
      </section>

      {state.slot && state.day && (
        <section ref={detailsRef} className="grid scroll-mt-24 gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
          <StepHeading n={2} title={t("steps.details")} />
          <p className="rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-foreground">
            {t("selected", {
              date: format.dateTime(fromDayString(state.day), { weekday: "long", day: "numeric", month: "long" }),
              time: state.slot.label,
            })}
          </p>
          <DetailsForm
            categoryId={categoryId}
            visitType={visitType}
            startAt={state.slot.start}
            repairDisclaimerAccepted={repairDisclaimerAccepted}
            onSuccess={state.finish}
            onSlotTaken={state.slotTaken}
          />
        </section>
      )}
    </div>
  );
}
