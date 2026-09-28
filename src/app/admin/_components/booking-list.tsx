import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import type { listBookings } from "@/server/services/admin";
import { fmtDateTime, visitTypeLabels } from "../_lib/format";
import { StatusBadge } from "./status-badge";

type Row = Awaited<ReturnType<typeof listBookings>>[number];

export function BookingList({ rows, empty = "Няма резервации." }: { rows: Row[]; empty?: string }) {
  if (rows.length === 0) return <p className="rounded-xl border border-dashed bg-background p-8 text-center text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-background">
      {rows.map(({ booking: b, categoryName, categoryIcon, teamName }) => (
        <li key={b.id}>
          <Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-muted/60">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
              <CategoryIcon name={categoryIcon} className="size-4" />
            </span>
            <span className="min-w-40 flex-1">
              <span className="block font-medium">{b.customerName}</span>
              <span className="block text-sm text-muted-foreground">
                {categoryName} · {visitTypeLabels[b.visitType]} · {teamName}
              </span>
            </span>
            <span className="text-sm font-medium tabular-nums">{fmtDateTime(b.startAt)}</span>
            <span className="font-mono text-xs text-muted-foreground">{b.ref}</span>
            <StatusBadge status={b.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
