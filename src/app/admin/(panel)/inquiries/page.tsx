import { Download, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/site";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { listContactRequests } from "@/server/services/contact-requests";
import { PageHeader } from "../../_components/page-header";
import { fmtDateTime } from "../../_lib/format";
import { InquiryActions } from "./inquiry-actions";

export const metadata = { title: "Запитвания" };

const filters = { open: "Необработени", handled: "Обработени", all: "Всички" } as const;

export default async function InquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  const q = await searchParams;
  const filter = typeof q.show === "string" && q.show in filters ? (q.show as keyof typeof filters) : "open";
  const rows = await listContactRequests(db, { handled: filter === "all" ? undefined : filter === "handled" });

  return (
    <>
      <PageHeader
        title="Запитвания"
        description="Данни за контакт, оставени през чат асистента на сайта."
        actions={
          <>
            <div className="bg-background inline-flex rounded-lg border p-1">
              {Object.entries(filters).map(([value, label]) => (
                <Link
                  key={value}
                  href={`/admin/inquiries?show=${value}`}
                  aria-current={filter === value ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium",
                    filter === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
            <Button asChild variant="outline">
              <a href="/admin/inquiries/export" download>
                <Download className="size-4" aria-hidden />
                Изтегли всички (CSV)
              </a>
            </Button>
          </>
        }
      />
      {rows.length === 0 ? (
        <p className="bg-background text-muted-foreground rounded-xl border p-6">Няма запитвания.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className={cn("bg-background grid gap-3 rounded-xl border p-4", r.handled && "opacity-70")}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-semibold">{r.name}</h2>
                <span className="text-muted-foreground text-sm">{fmtDateTime(r.createdAt)}</span>
                {r.locale === "en" && <span className="bg-muted rounded px-1.5 text-xs">EN</span>}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {r.phone && (
                  <a
                    href={`tel:${r.phone}`}
                    className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
                  >
                    <Phone className="size-4" aria-hidden />
                    {formatPhone(r.phone)}
                  </a>
                )}
                {r.email && (
                  <a
                    href={`mailto:${r.email}`}
                    className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
                  >
                    <Mail className="size-4" aria-hidden />
                    {r.email}
                  </a>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.description}</p>
              <InquiryActions id={r.id} handled={r.handled} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
