import { setRequestLocale } from "next-intl/server";
import { ContactFab } from "@/components/site/contact-fab";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { VariantSwitcher } from "@/components/site/variant-switcher";

export default async function MainLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <ContactFab />
      <VariantSwitcher current="main" />
    </>
  );
}
