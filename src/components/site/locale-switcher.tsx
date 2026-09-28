"use client";

import { Languages } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();
  const target = locale === "bg" ? "en" : "bg";

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1.5", className)}
      disabled={pending}
      lang={target}
      onClick={() =>
        startTransition(() => {
          // Category pages redirect to the slug of the new language on their own.
          const query = Object.fromEntries(new URLSearchParams(window.location.search));
          router.replace(
            // @ts-expect-error -- params always match the current pathname
            { pathname, params, query },
            { locale: target, scroll: false },
          );
        })
      }
    >
      <Languages className="size-4" aria-hidden />
      <span className="hidden sm:inline">{t("switchTo")}</span>
      <span className="sm:hidden" aria-hidden>
        {target.toUpperCase()}
      </span>
      <span className="sr-only sm:hidden">{t("switchTo")}</span>
    </Button>
  );
}
