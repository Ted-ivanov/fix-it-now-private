import { MessageCircle, Phone, Send } from "lucide-react";
import Image from "next/image";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { Link } from "@/i18n/navigation";
import { pick } from "@/lib/localized";
import { site, viberLink, whatsappLink } from "@/lib/site";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";
import { latestPhotos, photoUrls } from "@/server/services/galleries";

export default async function V4Home({ params }: PageProps<"/[locale]/v4">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations();
  const [categories, photos] = await Promise.all([getCatalog(db), latestPhotos(db, 6)]);

  const actions = [
    { href: `tel:${site.phone}`, label: t("nav.call"), icon: Phone, className: "bg-primary text-primary-foreground" },
    { href: viberLink(site.viber), label: "Viber", icon: MessageCircle, className: "bg-[#7360f2] text-white" },
    { href: whatsappLink(site.whatsapp), label: "WhatsApp", icon: Send, className: "bg-[#128c4a] text-white" },
  ];

  return (
    // minmax(0,1fr): the horizontal photo strip must scroll, not widen the page.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
      <section>
        <p className="text-lg text-muted-foreground">{t("v4.greeting")}</p>
        <h1 className="text-3xl font-bold tracking-tight">{t("v4.intro")}</h1>
      </section>

      <ul className="grid grid-cols-2 gap-3">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={{ pathname: "/v4/book", query: { category: locale === "en" ? c.slugEn : c.slugBg } }}
              className="flex aspect-square flex-col justify-between rounded-3xl bg-background p-5 shadow-sm transition active:scale-95"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-accent text-primary">
                <CategoryIcon name={c.icon} className="size-6" />
              </span>
              <span className="text-lg leading-tight font-semibold">{pick(locale, c.nameBg, c.nameEn)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="mb-3 font-semibold">{t("v4.quickActions")}</h2>
        <ul className="grid grid-cols-3 gap-3">
          {actions.map(({ href, label, icon: Icon, className }) => (
            <li key={label}>
              <a href={href} className={`flex flex-col items-center gap-1.5 rounded-2xl p-4 text-sm font-semibold shadow-sm ${className}`}>
                <Icon className="size-6" aria-hidden />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {photos.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t("ourWork.title")}</h2>
            <Link href="/our-work" className="text-sm font-semibold text-primary">
              →
              <span className="sr-only">{t("v3.seeAll")}</span>
            </Link>
          </div>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {photos.map(({ photo, slug, titleBg, titleEn }) => (
              <li key={photo.id} className="w-60 shrink-0 snap-start">
                <Link href={{ pathname: "/our-work/[slug]", params: { slug } }} className="block overflow-hidden rounded-2xl">
                  <Image
                    src={photoUrls(photo).thumb}
                    alt={pick(locale, titleBg, titleEn)}
                    width={480}
                    height={360}
                    placeholder="blur"
                    blurDataURL={photo.blurDataUrl}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
