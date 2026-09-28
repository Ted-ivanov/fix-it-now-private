"use client";

import { ArrowLeft, CalendarClock, ClipboardList, Phone, ShieldCheck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { BookingDatePicker } from "@/components/booking/date-picker";
import { BookingSuccess } from "@/components/booking/booking-success";
import { useBookingState } from "@/components/booking/booking-flow";
import type { ClientCategory } from "@/components/booking/client-category";
import { DetailsForm } from "@/components/booking/details-form";
import { SlotPicker } from "@/components/booking/slot-picker";
import { fromDayString } from "@/components/booking/use-availability";
import { VisitTypePicker, type VisitType } from "@/components/booking/visit-type-picker";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Step = "service" | "visit" | "time" | "details";
const steps: Step[] = ["service", "visit", "time", "details"];

/** V2: one question at a time with a progress bar and a summary that follows you. */
export function BookingWizard({
  categories,
  initialCategory,
  problem,
}: {
  categories: ClientCategory[];
  initialCategory?: string;
  problem?: string;
}) {
  const t = useTranslations();
  const preset =categories.find((c) => c.slug === initialCategory);
  const [category, setCategory] = useState<ClientCategory | null>(preset ?? null);
  const [visit, setVisit] = useState<VisitType | null>(null);
  const [step, setStep] = useState<Step>(preset ? "visit" : "service");

  if (!category || !visit || step === "service" || step === "visit") {
    return (
      <WizardShell step={step} onBack={step === "visit" ? () => setStep("service") : undefined} summary={<Summary category={category} />}>
        {step === "service" || !category ? (
          <>
            <h2 className="text-xl font-semibold">{t("home.categoriesLabel")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategory(c);
                    setStep("visit");
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary",
                    category?.id === c.id && "border-primary ring-2 ring-primary/20",
                  )}
                >
                  <span className="grid size-11 place-items-center rounded-lg bg-accent text-primary">
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{c.name}</span>
                    <span className="block text-sm text-muted-foreground">{c.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold">{t("category.chooseVisit")}</h2>
            <VisitTypePicker
              compact
              durations={category.durations}
              onChoose={(type) => {
                setVisit(type);
                setStep("time");
              }}
            />
          </>
        )}
      </WizardShell>
    );
  }

  return (
    <TimeAndDetails
      key={`${category.id}-${visit}`}
      category={category}
      visit={visit}
      step={step}
      setStep={setStep}
      problem={problem}
    />
  );
}

function TimeAndDetails({
  category,
  visit,
  step,
  setStep,
  problem,
}: {
  category: ClientCategory;
  visit: VisitType;
  step: Step;
  setStep: (s: Step) => void;
  problem?: string;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const state = useBookingState(category.id, visit);
  const when =
    state.day && state.slot
      ? t("booking.selected", {
          date: format.dateTime(fromDayString(state.day), { weekday: "short", day: "numeric", month: "long" }),
          time: state.slot.label,
        })
      : null;

  if (state.result) return <BookingSuccess result={state.result} homeHref="/v2" />;

  return (
    <WizardShell
      step={step}
      onBack={() => setStep(step === "details" ? "time" : "visit")}
      summary={<Summary category={category} visit={visit} when={when} />}
    >
      {step === "time" ? (
        <>
          <h2 className="text-xl font-semibold">
            {t("booking.pickDate")} · {t("booking.pickTime")}
          </h2>
          <BookingDatePicker categoryId={category.id} visitType={visit} value={state.day} onChange={state.pickDay} />
          {state.day && (
            <SlotPicker
              slots={state.slots.slots}
              loading={state.slots.loading}
              value={state.slot?.start ?? null}
              onChange={(slot) => {
                state.pickSlot(slot);
                setStep("details");
              }}
              columns="grid-cols-3 sm:grid-cols-5"
            />
          )}
        </>
      ) : (
        state.slot && (
          <>
            <h2 className="text-xl font-semibold">{t("booking.steps.details")}</h2>
            <DetailsForm
              categoryId={category.id}
              visitType={visit}
              startAt={state.slot.start}
              repairDisclaimerAccepted={visit === "repair"}
              defaultDescription={problem}
              onSuccess={state.finish}
              onSlotTaken={() => {
                state.slotTaken();
                setStep("time");
              }}
            />
          </>
        )
      )}
    </WizardShell>
  );
}

function WizardShell({
  step,
  onBack,
  summary,
  children,
}: {
  step: Step;
  onBack?: () => void;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const index = steps.indexOf(step) + 1;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid content-start gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-sm">
            {onBack ? (
              <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
                <ArrowLeft className="size-4" aria-hidden />
                {t("booking.back")}
              </Button>
            ) : (
              <span />
            )}
            <span className="font-medium text-muted-foreground">{t("v2.stepOf", { step: index, total: steps.length })}</span>
          </div>
          <Progress value={(index / steps.length) * 100} aria-label={t("v2.stepOf", { step: index, total: steps.length })} />
        </div>
        {children}
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">{summary}</aside>
    </div>
  );
}

function Summary({ category, visit, when }: { category: ClientCategory | null; visit?: VisitType; when?: string | null }) {
  const t = useTranslations();
  return (
    <div className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">{t("v2.summary")}</h2>
      <dl className="grid gap-3 text-sm">
        <div className="flex items-center gap-3">
          <dt className="sr-only">{t("booking.service")}</dt>
          {category ? <CategoryIcon name={category.icon} className="size-4 text-primary" /> : <ClipboardList className="size-4 text-muted-foreground" aria-hidden />}
          <dd className={cn(!category && "text-muted-foreground")}>{category?.name ?? "—"}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="sr-only">{t("booking.visit")}</dt>
          <ClipboardList className="size-4 text-primary" aria-hidden />
          <dd className={cn(!visit && "text-muted-foreground")}>{visit ? t(`visitTypes.${visit}`) : "—"}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="sr-only">{t("booking.success.when")}</dt>
          <CalendarClock className="size-4 text-primary" aria-hidden />
          <dd className={cn(!when && "text-muted-foreground")}>{when ?? "—"}</dd>
        </div>
      </dl>
      <ul className="grid gap-2 border-t pt-4 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <Phone className="size-3.5 text-primary" aria-hidden />
          {t("v2.promise")}
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden />
          {t("v2.freeCancel")}
        </li>
      </ul>
    </div>
  );
}
