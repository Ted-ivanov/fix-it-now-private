import { CalendarCheck, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import { SiteFooter } from "@/components/site/site-footer";
import { VariantSwitcher } from "@/components/site/variant-switcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatPhone, site } from "@/lib/site";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function V3Layout({ children, params }: LayoutProps<"/[locale]/v3">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("v3");
  const nav = await getTranslations("nav");
  return (
    <>
      <div className="bg-foreground text-sm text-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
          <span className="hidden sm:inline">{(await getTranslations("contact"))("hoursValue")}</span>
          <a href={`tel:${site.phone}`} className="ml-auto inline-flex items-center gap-1.5 font-semibold">
            <Phone className="size-4" aria-hidden />
            {formatPhone(site.phone)}
          </a>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/v3">
            <Logo />
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            <Link href="/our-work" className="hidden rounded-md px-3 py-2 text-sm font-medium hover:text-primary sm:block">
              {nav("ourWork")}
            </Link>
            <LocaleSwitcher />
            <Button asChild className="ml-1">
              <Link href="/v3/book">
                <CalendarCheck className="size-4" aria-hidden />
                {t("bookNow")}
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <VariantSwitcher current="v3" />
    </>
  );
}
