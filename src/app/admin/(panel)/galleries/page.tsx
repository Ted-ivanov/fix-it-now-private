import { Eye, EyeOff, ImagePlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/server/db";
import { listAllGalleries, photoUrls } from "@/server/services/galleries";
import { PageHeader } from "../../_components/page-header";

export const metadata = { title: "Галерии" };

export default async function GalleriesPage() {
  const rows = await listAllGalleries(db);
  return (
    <>
      <PageHeader
        title="Галерии"
        description="Снимки от обекти за страницата „Завършени проекти“."
        actions={
          <Button asChild>
            <Link href="/admin/galleries/upload">
              <ImagePlus className="size-4" aria-hidden />
              Качи снимки
            </Link>
          </Button>
        }
      />
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-background p-10 text-center text-muted-foreground">
          Все още няма галерии. Качете първите снимки.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map(({ gallery: g, photoCount, cover }) => (
            <li key={g.id}>
              <Link href={`/admin/galleries/${g.id}`} className="block overflow-hidden rounded-xl border bg-background hover:shadow-md">
                <div className="aspect-[4/3] bg-muted">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                    <img src={photoUrls(cover).thumb} alt="" className="size-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate font-medium">{g.titleBg}</p>
                  <p className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{photoCount} снимки</span>
                    <span className="inline-flex items-center gap-1">
                      {g.published ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
                      {g.published ? "Публикувана" : "Скрита"}
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
