import { CalendarDays, Clock, ImagePlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/server/db";
import { countBookings, listBookings } from "@/server/services/admin";
import { addDays, sofiaDay, sofiaInstant } from "@/server/services/time";
import { BookingList } from "../_components/booking-list";
import { PageHeader } from "../_components/page-header";
import { fmtDate } from "../_lib/format";

export const metadata = { title: "Табло" };

export default async function DashboardPage() {
  const today = sofiaDay(new Date());
  const [todayCount, weekCount, todays, upcoming] = await Promise.all([
    countBookings(db, sofiaInstant(today, 0), sofiaInstant(addDays(today, 1), 0)),
    countBookings(db, sofiaInstant(today, 0), sofiaInstant(addDays(today, 7), 0)),
    listBookings(db, { from: today, to: today }),
    listBookings(db, { from: addDays(today, 1), to: addDays(today, 7), status: "pending" }),
  ]);

  const stats = [
    { label: "Посещения днес", value: todayCount.total, icon: CalendarDays },
    { label: "Следващите 7 дни", value: weekCount.total, icon: Clock },
    { label: "Непотвърдени (7 дни)", value: weekCount.pending, icon: Clock },
  ];

  return (
    <>
      <PageHeader
        title="Табло"
        description={fmtDate(new Date())}
        actions={
          <Button asChild>
            <Link href="/admin/galleries/upload">
              <ImagePlus className="size-4" aria-hidden />
              Качи снимки
            </Link>
          </Button>
        }
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-background p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="size-4" aria-hidden />
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-3 text-lg font-semibold">Днес</h2>
      <BookingList rows={todays} empty="Няма посещения днес." />
      <h2 className="mt-8 mb-3 text-lg font-semibold">Чакат потвърждение (следващите 7 дни)</h2>
      <BookingList rows={upcoming} empty="Всички заявки са потвърдени." />
    </>
  );
}
