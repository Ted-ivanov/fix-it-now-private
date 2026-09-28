import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <SearchX className="size-12 text-primary" aria-hidden />
      <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("body")}</p>
      <Button asChild className="mt-8">
        <Link href="/">{t("home")}</Link>
      </Button>
    </main>
  );
}
