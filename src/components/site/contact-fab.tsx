import { MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { site, viberLink } from "@/lib/site";

/** Floating call and Viber buttons, always within thumb reach on phones. */
export async function ContactFab() {
  const t = await getTranslations("nav");
  const tc = await getTranslations("contact");
  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col gap-3 print:hidden">
      {site.viber && (
        <a
          href={viberLink(site.viber)}
          className="grid size-12 place-items-center rounded-full bg-[#7360f2] text-white shadow-lg transition hover:scale-105 focus-visible:ring-4 focus-visible:ring-[#7360f2]/40 focus-visible:outline-none"
          aria-label={tc("viber")}
        >
          <MessageCircle className="size-6" aria-hidden />
        </a>
      )}
      <a
        href={`tel:${site.phone}`}
        className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none"
        aria-label={t("call")}
      >
        <Phone className="size-6" aria-hidden />
      </a>
    </div>
  );
}
