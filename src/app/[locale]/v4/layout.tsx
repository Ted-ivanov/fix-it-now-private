import { CalendarPlus, House, Images, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import { VariantSwitcher } from "@/components/site/variant-switcher";
import { Link } from "@/i18n/navigation";
import { site } from "@/lib/site";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** V4: app-like shell with a bottom tab bar, designed for phones first. */
export default async function V4Layout({ children, params }: LayoutProps<"/[locale]/v4">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const tab = "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-muted-foreground hover:text-primary";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/50">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link href="/v4">
            <Logo />
          </Link>
          <LocaleSwitcher />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 pt-5 pb-28">
        {children}
      </main>
      <nav
        aria-label={t("menu")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto flex max-w-xl">
          <Link href="/v4" className={tab}>
            <House className="size-5" aria-hidden />
            {t("home")}
          </Link>
          <Link href="/v4/book" className={tab}>
            <CalendarPlus className="size-5" aria-hidden />
            {t("book")}
          </Link>
          <Link href="/our-work" className={tab}>
            <Images className="size-5" aria-hidden />
            {t("ourWorkShort")}
          </Link>
          <a href={`tel:${site.phone}`} className={tab}>
            <Phone className="size-5" aria-hidden />
            {t("call")}
          </a>
        </div>
      </nav>
      <VariantSwitcher current="v4" className="bottom-20" />
    </div>
  );
}
