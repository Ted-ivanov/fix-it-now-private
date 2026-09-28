import { getTranslations } from "next-intl/server";
import { site } from "@/lib/site";

/** Structured data so Google can show the business (phone, hours, area) in local results. */
export async function LocalBusinessJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "meta" });
  const data = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: site.name,
    description: t("description"),
    url: locale === "bg" ? site.url : `${site.url}/en`,
    telephone: site.phone,
    email: site.email,
    areaServed: { "@type": "City", name: "Sofia" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "14:00" },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be inline; "<" is escaped so the content cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
