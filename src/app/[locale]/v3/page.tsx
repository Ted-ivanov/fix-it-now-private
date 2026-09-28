import { BadgeCheck, CalendarCheck, Clock, MapPin, Phone, Quote, ShieldCheck, Sparkles, Star, Truck, Wrench } from "lucide-react";
import Image from "next/image";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pick } from "@/lib/localized";
import { site } from "@/lib/site";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";
import { latestPhotos, photoUrls } from "@/server/services/galleries";

export default async function V3Home({ params }: PageProps<"/[locale]/v3">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations("v3");
  const [categories, photos] = await Promise.all([getCatalog(db), latestPhotos(db, 8)]);
  const hero = photos[0];

  const trust = [
    { icon: BadgeCheck, text: t("trust.guarantee") },
    { icon: ShieldCheck, text: t("trust.insured") },
    { icon: Clock, text: t("trust.onTime") },
    { icon: Sparkles, text: t("trust.clean") },
  ];
  const how = [
    { icon: CalendarCheck, title: t("how1Title"), text: t("how1") },
    { icon: Truck, title: t("how2Title"), text: t("how2") },
    { icon: Wrench, title: t("how3Title"), text: t("how3") },
  ];
  const reviews = (["r1", "r2", "r3"] as const).map((r) => ({ text: t(`reviews.${r}`), author: t(`reviews.${r}Author`) }));

  return (
    <>
      {/* Hero: latest real job photo when available, otherwise a dark brand panel. */}
      <section className="relative isolate overflow-hidden bg-foreground text-background">
        {hero && (
          <Image
            src={photoUrls(hero.photo).large}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover opacity-35"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/30" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
              ))}
              <span className="ml-1">{t("trust.guarantee")}</span>
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">{t("heroTitle")}</h1>
            <p className="mt-4 text-lg text-white/80">{t("heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/v3/book">{t("bookNow")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white">
                <a href={`tel:${site.phone}`}>
                  <Phone className="size-4" aria-hidden />
                  {t("callUs")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 lg:grid-cols-4">
          {trust.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 font-medium">
              <Icon className="size-6 shrink-0 text-primary" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-3xl font-bold tracking-tight">{t("servicesTitle")}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={{ pathname: "/v3/book", query: { category: locale === "en" ? c.slugEn : c.slugBg } }}
                className="group flex h-full flex-col gap-3 rounded-2xl border bg-card p-6 transition hover:border-primary hover:shadow-md"
              >
                <CategoryIcon name={c.icon} className="size-9 text-primary" strokeWidth={1.75} />
                <span className="text-lg font-semibold">{pick(locale, c.nameBg, c.nameEn)}</span>
                <span className="text-sm text-muted-foreground">{pick(locale, c.descriptionBg, c.descriptionEn)}</span>
                <span className="mt-auto text-sm font-semibold text-primary group-hover:underline">{t("bookNow")} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-3xl font-bold tracking-tight">{t("howTitle")}</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {how.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-2xl bg-background p-6 shadow-sm">
                <span className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{i + 1}</span>
                  <Icon className="size-6 text-primary" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {photos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-bold tracking-tight">{t("workTitle")}</h2>
            <Link href="/our-work" className="font-semibold text-primary hover:underline">
              {t("seeAll")} →
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map(({ photo, slug, titleBg, titleEn }) => (
              <li key={photo.id}>
                <Link href={{ pathname: "/our-work/[slug]", params: { slug } }} className="group block overflow-hidden rounded-xl">
                  <Image
                    src={photoUrls(photo).thumb}
                    alt={pick(locale, titleBg, titleEn)}
                    width={480}
                    height={360}
                    placeholder="blur"
                    blurDataURL={photo.blurDataUrl}
                    className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-accent/50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold tracking-tight">{t("reviewsTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground italic">{t("reviewsPlaceholder")}</p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.author} className="rounded-2xl bg-background p-6 shadow-sm">
                <Quote className="size-6 text-primary" aria-hidden />
                <p className="mt-3">{r.text}</p>
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
                  <span className="flex" aria-label="5/5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                    ))}
                  </span>
                  {r.author}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight">{t("faqTitle")}</h2>
          <Accordion type="single" collapsible>
            {([1, 2, 3, 4] as const).map((n) => (
              <AccordionItem key={n} value={`q${n}`}>
                <AccordionTrigger className="text-left text-base">{t(`faq.q${n}`)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{t(`faq.a${n}`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div className="rounded-2xl bg-foreground p-8 text-background">
          <MapPin className="size-8 text-primary" aria-hidden />
          <h2 className="mt-4 text-2xl font-bold">{t("areaTitle")}</h2>
          <p className="mt-2 text-white/80">{t("areaBody")}</p>
          <Button asChild size="lg" className="mt-6">
            <a href={`tel:${site.phone}`}>
              <Phone className="size-4" aria-hidden />
              {t("callUs")}
            </a>
          </Button>
        </div>
      </section>
    </>
  );
}
