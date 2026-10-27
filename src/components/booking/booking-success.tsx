"use client";

import { CalendarCheck, CalendarPlus, CircleCheck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { BookingSuccess as Result } from "./details-form";

export function BookingSuccess({ result, homeHref = "/" }: { result: Result; homeHref?: "/" | "/v2" | "/v3" | "/v4" }) {
  const t = useTranslations("booking.success");
  const format = useFormatter();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation so screen reader users hear it.
  useEffect(() => headingRef.current?.focus(), []);

  const when = format.dateTime(new Date(result.startAt), {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-center rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-12">
      <CircleCheck className="size-14 text-green-600" aria-hidden />
      <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-bold outline-none">
        {t("title")}
      </h2>
      <p className="mt-2 max-w-md text-muted-foreground">{t("body", { email: result.email })}</p>
      <dl className="mt-6 grid w-full max-w-sm gap-3 rounded-xl bg-muted/60 p-4 text-left">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted-foreground">{t("ref")}</dt>
          <dd className="font-mono text-lg font-semibold tracking-wider">{result.ref}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-sm text-muted-foreground">{t("when")}</dt>
          <dd className="flex items-center gap-1.5 text-right font-medium">
            <CalendarCheck className="size-4 shrink-0 text-primary" aria-hidden />
            {when}
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground mt-6 text-sm">{t("addToCalendar")}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <a href={result.calendar.google} target="_blank" rel="noopener noreferrer">
            <CalendarPlus className="size-4" aria-hidden />
            {t("googleCalendar")}
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a href={result.calendar.ics} download>
            <CalendarPlus className="size-4" aria-hidden />
            {t("otherCalendar")}
          </a>
        </Button>
      </div>
      <Button asChild variant="outline" className="mt-8">
        <Link href={homeHref}>{t("backHome")}</Link>
      </Button>
    </div>
  );
}
