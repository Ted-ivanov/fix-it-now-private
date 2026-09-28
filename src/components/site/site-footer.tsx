import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPhone, site } from "@/lib/site";
import { Logo } from "./logo";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tc = await getTranslations("contact");
  return (
    <footer className="mt-auto border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Logo />
        </div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Phone className="size-4 text-primary" aria-hidden />
            <span className="sr-only">{tc("phone")}: </span>
            <a href={`tel:${site.phone}`} className="hover:underline">
              {formatPhone(site.phone)}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Mail className="size-4 text-primary" aria-hidden />
            <span className="sr-only">{tc("email")}: </span>
            <a href={`mailto:${site.email}`} className="hover:underline">
              {site.email}
            </a>
          </li>
        </ul>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-medium">{tc("hours")}:</span> {tc("hoursValue")}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-medium">{tc("area")}:</span> {tc("areaValue")}
            </span>
          </li>
        </ul>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/privacy" className="hover:underline">
              {t("privacy")}
            </Link>
          </li>
          <li>
            <Link href="/terms" className="hover:underline">
              {t("terms")}
            </Link>
          </li>
        </ul>
      </div>
      <p className="border-t py-4 text-center text-xs text-muted-foreground">
        {t("rights", { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
