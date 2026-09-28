import { TIME_ZONE } from "@/server/services/time";

const dateTime = new Intl.DateTimeFormat("bg-BG", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat("bg-BG", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" });
const time = new Intl.DateTimeFormat("bg-BG", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });

export const fmtDateTime = (d: Date) => dateTime.format(d);
export const fmtDate = (d: Date) => dateOnly.format(d);
export const fmtTime = (d: Date) => time.format(d);

export const statusLabels = {
  pending: "Нова",
  confirmed: "Потвърдена",
  done: "Изпълнена",
  cancelled: "Отказана",
} as const;

export const statusClasses = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  confirmed: "bg-blue-100 text-blue-900 border-blue-200",
  done: "bg-green-100 text-green-900 border-green-200",
  cancelled: "bg-muted text-muted-foreground line-through",
} as const;

export const visitTypeLabels = { inspection: "Оглед", repair: "Ремонт" } as const;

export const weekdayNames = ["", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота", "Неделя"];

export function minutesToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
