import { TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { privacy, terms } from "./legal-content";

export async function LegalPage({ doc, locale }: { doc: "privacy" | "terms"; locale: string }) {
  const t = await getTranslations("legal");
  const content = (doc === "privacy" ? privacy : terms)[locale === "en" ? "en" : "bg"];
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t(doc === "privacy" ? "privacyTitle" : "termsTitle")}</h1>
      <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        {t("draftNotice")}
      </p>
      {content.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="text-xl font-semibold">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="mt-3 leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
