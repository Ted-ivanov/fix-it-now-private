import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPhone } from "@/lib/site";
import { db } from "@/server/db";
import { getBookingDetail } from "@/server/services/admin";
import { PageHeader } from "../../../_components/page-header";
import { StatusBadge } from "../../../_components/status-badge";
import { fmtDateTime, fmtTime, visitTypeLabels } from "../../../_lib/format";
import { BookingActions } from "./booking-actions";

export const metadata = { title: "Резервация" };

export default async function BookingDetailPage({ params }: PageProps<"/admin/bookings/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const detail = await getBookingDetail(db, id);
  if (!detail) notFound();
  const b = detail.booking;

  const rows: [string, string][] = [
    ["Услуга", detail.categoryName],
    ["Посещение", visitTypeLabels[b.visitType]],
    ["Кога", `${fmtDateTime(b.startAt)} – ${fmtTime(b.endAt)}`],
    ["Екип", detail.teamName],
    ["Зает до (с пътя)", fmtTime(b.blockedUntil)],
    ["Език", b.locale === "bg" ? "Български" : "English"],
    ["Създадена", fmtDateTime(b.createdAt)],
  ];
  if (b.visitType === "repair") {
    rows.push([
      "Предупреждение за доплащане",
      b.repairDisclaimerAcceptedAt ? `Прието ${fmtDateTime(b.repairDisclaimerAcceptedAt)}` : "Не",
    ]);
  }

  return (
    <>
      <Link href="/admin/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Резервации
      </Link>
      <PageHeader title={`${b.customerName}`} description={b.ref} actions={<StatusBadge status={b.status} />} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <section className="rounded-xl border bg-background p-5">
            <h2 className="mb-3 font-semibold">Контакт</h2>
            <ul className="grid gap-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary" aria-hidden />
                <a href={`tel:${b.phone}`} className="font-medium hover:underline">
                  {formatPhone(b.phone)}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-primary" aria-hidden />
                <a href={`mailto:${b.email}`} className="hover:underline">
                  {b.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" aria-hidden />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {b.address}
                </a>
              </li>
            </ul>
          </section>
          <section className="rounded-xl border bg-background p-5">
            <h2 className="mb-3 font-semibold">Описание на проблема</h2>
            <p className="whitespace-pre-wrap">{b.description}</p>
          </section>
          {detail.photos.length > 0 && (
            <section className="rounded-xl border bg-background p-5">
              <h2 className="mb-3 font-semibold">Снимки от клиента</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {detail.photos.map((p) => (
                  <li key={p.id}>
                    <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                      <img src={p.url} alt="Снимка от клиента" className="aspect-square w-full object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className="grid content-start gap-6">
          <section className="rounded-xl border bg-background p-5">
            <dl className="grid gap-3 text-sm">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <BookingActions id={b.id} status={b.status} note={b.adminNote ?? ""} />
        </div>
      </div>
    </>
  );
}
