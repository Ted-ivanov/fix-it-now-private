import { Images, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPhone, site } from "@/lib/site";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <Logo />
        </Link>
        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/our-work"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium whitespace-nowrap hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3"
          >
            <Images className="size-4 sm:hidden" aria-hidden />
            <span className="sr-only sm:not-sr-only">{t("ourWork")}</span>
          </Link>
          <a
            href={`tel:${site.phone}`}
            className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-accent md:inline-flex"
          >
            <Phone className="size-4" aria-hidden />
            {formatPhone(site.phone)}
          </a>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
