import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { bookingsForTeams, listBookings, listCategoriesWithDurations, listTeams } from "@/server/services/admin";
import { addDays, sofiaDay } from "@/server/services/time";
import { BookingList } from "../../_components/booking-list";
import { PageHeader } from "../../_components/page-header";
import { StatusBadge } from "../../_components/status-badge";
import { fmtDate, fmtTime, statusLabels, visitTypeLabels } from "../../_lib/format";

export const metadata = { title: "Резервации" };

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const q = await searchParams;
  const today = sofiaDay(new Date());
  const view = q.view === "list" ? "list" : "day";

  return (
    <>
      <PageHeader
        title="Резервации"
        actions={
          <div className="inline-flex rounded-lg border bg-background p-1">
            {(["day", "list"] as const).map((v) => (
              <Link
                key={v}
                href={`/admin/bookings?view=${v}`}
                aria-current={view === v ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {v === "day" ? "По екипи (ден)" : "Списък"}
              </Link>
            ))}
          </div>
        }
      />
      {view === "day" ? (
        <DayView day={isDay(q.date) ? q.date : today} />
      ) : (
        <ListView
          from={isDay(q.from) ? q.from : today}
          to={isDay(q.to) ? q.to : addDays(today, 30)}
          status={typeof q.status === "string" && q.status in statusLabels ? (q.status as keyof typeof statusLabels) : undefined}
          categoryId={typeof q.category === "string" && q.category ? q.category : undefined}
        />
      )}
    </>
  );
}

/** One column per team so the office sees each crew's day at a glance. */
async function DayView({ day }: { day: string }) {
  const [teams, rows] = await Promise.all([listTeams(db), bookingsForTeams(db, day)]);
  const activeTeams = teams.filter((t) => t.active || rows.some((r) => r.booking.teamId === t.id));
  const nav = (d: string) => `/admin/bookings?view=day&date=${d}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Предишен ден">
          <Link href={nav(addDays(day, -1))}>
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon" aria-label="Следващ ден">
          <Link href={nav(addDays(day, 1))}>
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={nav(sofiaDay(new Date()))}>Днес</Link>
        </Button>
        <form className="flex items-center gap-2">
          <input type="hidden" name="view" value="day" />
          <input
            type="date"
            name="date"
            defaultValue={day}
            className="h-9 rounded-md border bg-background px-2 text-sm"
            aria-label="Дата"
          />
          <Button type="submit" size="sm" variant="secondary">
            Покажи
          </Button>
        </form>
        <p className="ml-auto font-semibold first-letter:uppercase">{fmtDate(new Date(`${day}T12:00:00Z`))}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeTeams.map((t) => {
          const jobs = rows.filter((r) => r.booking.teamId === t.id);
          return (
            <section key={t.id} className="rounded-xl border bg-background">
              <h2 className="flex items-center justify-between border-b px-4 py-3 font-semibold">
                {t.name}
                <span className="text-sm font-normal text-muted-foreground">{jobs.length} посещения</span>
              </h2>
              {jobs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Свободен ден.</p>
              ) : (
                <ul className="divide-y">
                  {jobs.map(({ booking: b, categoryName, categoryIcon }) => (
                    <li key={b.id}>
                      <Link href={`/admin/bookings/${b.id}`} className="flex gap-3 p-4 hover:bg-muted/60">
                        <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">
                          {fmtTime(b.startAt)}–{fmtTime(b.endAt)}
                          <span className="block text-xs font-normal text-muted-foreground">
                            +път до {fmtTime(b.blockedUntil)}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CategoryIcon name={categoryIcon} className="size-3.5 text-primary" />
                            {categoryName} · {visitTypeLabels[b.visitType]}
                          </span>
                          <span className="block truncate text-sm">{b.customerName}</span>
                          <span className="block truncate text-sm text-muted-foreground">{b.address}</span>
                        </span>
                        <StatusBadge status={b.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

async function ListView(props: {
  from: string;
  to: string;
  status?: keyof typeof statusLabels;
  categoryId?: string;
}) {
  const [rows, categories] = await Promise.all([listBookings(db, props), listCategoriesWithDurations(db)]);
  const field = "h-9 rounded-md border bg-background px-2 text-sm";
  return (
    <>
      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-background p-4">
        <input type="hidden" name="view" value="list" />
        <label className="grid gap-1 text-sm">
          От
          <input type="date" name="from" defaultValue={props.from} className={field} />
        </label>
        <label className="grid gap-1 text-sm">
          До
          <input type="date" name="to" defaultValue={props.to} className={field} />
        </label>
        <label className="grid gap-1 text-sm">
          Статус
          <select name="status" defaultValue={props.status ?? ""} className={field}>
            <option value="">Всички</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Услуга
          <select name="category" defaultValue={props.categoryId ?? ""} className={field}>
            <option value="">Всички</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameBg}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm">
          Филтрирай
        </Button>
      </form>
      <BookingList rows={rows} />
    </>
  );
}
