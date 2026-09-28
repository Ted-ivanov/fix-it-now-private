"use client";

import { Bot, RotateCcw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBookingState } from "@/components/booking/booking-flow";
import { BookingSuccess } from "@/components/booking/booking-success";
import type { ClientCategory } from "@/components/booking/client-category";
import { BookingDatePicker } from "@/components/booking/date-picker";
import { DetailsForm } from "@/components/booking/details-form";
import { SlotPicker } from "@/components/booking/slot-picker";
import { fromDayString } from "@/components/booking/use-availability";
import { VisitTypePicker, type VisitType } from "@/components/booking/visit-type-picker";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";

function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <Bot className="size-4" aria-hidden />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-card px-4 py-3 shadow-sm">{children}</div>
    </div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 font-medium text-primary-foreground">
        {children}
      </div>
    </div>
  );
}

/** V4: booking as a short conversation, one question per message, answers appear as replies. */
export function ChatBooking({ categories, initialCategory }: { categories: ClientCategory[]; initialCategory?: string }) {
  const [category, setCategory] = useState<ClientCategory | null>(
    categories.find((c) => c.slug === initialCategory) ?? null,
  );
  const [visit, setVisit] = useState<VisitType | null>(null);
  const [session, setSession] = useState(0);
  const t = useTranslations();

  const restart = () => {
    setCategory(null);
    setVisit(null);
    setSession((s) => s + 1);
  };

  return (
    <div className="grid gap-4" aria-live="polite">
      <BotBubble>
        <p className="font-semibold">{t("v4.greeting")}</p>
        <p>{t("v4.askCategory")}</p>
      </BotBubble>
      {!category ? (
        <div className="grid grid-cols-2 gap-2 pl-10">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c)}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 bg-card p-4 text-center font-semibold transition active:scale-95 hover:border-primary"
            >
              <CategoryIcon name={c.icon} className="size-7 text-primary" />
              {c.name}
            </button>
          ))}
        </div>
      ) : (
        <UserBubble>{category.name}</UserBubble>
      )}

      {category && (
        <>
          <BotBubble>{t("v4.askVisit")}</BotBubble>
          {!visit ? (
            <div className="pl-10">
              <VisitTypePicker compact durations={category.durations} onChoose={setVisit} />
            </div>
          ) : (
            <UserBubble>{t(`visitTypes.${visit}`)}</UserBubble>
          )}
        </>
      )}

      {category && visit && <ChatSchedule key={`${session}-${category.id}-${visit}`} category={category} visit={visit} />}

      {(category || visit) && (
        <Button variant="ghost" size="sm" className="justify-self-center text-muted-foreground" onClick={restart}>
          <RotateCcw className="size-4" aria-hidden />
          {t("v4.restart")}
        </Button>
      )}
    </div>
  );
}

function ChatSchedule({ category, visit }: { category: ClientCategory; visit: VisitType }) {
  const t = useTranslations();
  const format = useFormatter();
  const state = useBookingState(category.id, visit);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest question in view, like a messaging app.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.day, state.slot, state.result]);

  if (state.result) {
    return (
      <>
        <UserBubble>✓</UserBubble>
        <BookingSuccess result={state.result} homeHref="/v4" />
      </>
    );
  }

  return (
    <>
      <BotBubble>{t("v4.askDate")}</BotBubble>
      {!state.day ? (
        <div className="pl-10">
          <BookingDatePicker categoryId={category.id} visitType={visit} value={state.day} onChange={state.pickDay} />
        </div>
      ) : (
        <button type="button" className="justify-self-end" onClick={() => state.reset()} aria-label={t("booking.change")}>
          <UserBubble>{format.dateTime(fromDayString(state.day), { weekday: "long", day: "numeric", month: "long" })}</UserBubble>
        </button>
      )}

      {state.day && (
        <>
          <BotBubble>{t("v4.askTime")}</BotBubble>
          {!state.slot ? (
            <div className="pl-10">
              <SlotPicker
                slots={state.slots.slots}
                loading={state.slots.loading}
                value={null}
                onChange={state.pickSlot}
                columns="grid-cols-3"
              />
            </div>
          ) : (
            <button type="button" className="justify-self-end" onClick={() => state.pickDay(state.day!)} aria-label={t("booking.change")}>
              <UserBubble>{state.slot.label}</UserBubble>
            </button>
          )}
        </>
      )}

      {state.slot && (
        <>
          <BotBubble>{t("v4.askDetails")}</BotBubble>
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <DetailsForm
              categoryId={category.id}
              visitType={visit}
              startAt={state.slot.start}
              repairDisclaimerAccepted={visit === "repair"}
              onSuccess={state.finish}
              onSlotTaken={state.slotTaken}
            />
          </div>
        </>
      )}
      <div ref={endRef} />
    </>
  );
}
