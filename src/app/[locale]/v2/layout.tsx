import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ContactFab } from "@/components/site/contact-fab";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { VariantSwitcher } from "@/components/site/variant-switcher";

// Alternative design for comparison: kept out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function V2Layout({ children, params }: LayoutProps<"/[locale]/v2">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-gradient-to-b from-accent/60 to-background">
        {children}
      </main>
      <SiteFooter />
      <ContactFab />
      <VariantSwitcher current="v2" />
    </>
  );
}
