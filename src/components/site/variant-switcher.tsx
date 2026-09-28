import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const variants = [
  { key: "main", href: "/" },
  { key: "v2", href: "/v2" },
  { key: "v3", href: "/v3" },
  { key: "v4", href: "/v4" },
] as const;

/** Floating "Design 1 · 2 · 3 · 4" switcher for comparing the alternative front ends. */
export async function VariantSwitcher({
  current,
  className,
}: {
  current: (typeof variants)[number]["key"];
  className?: string;
}) {
  if (!site.showVariants) return null;
  const t = await getTranslations("variants");
  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background/95 p-1 text-xs shadow-lg backdrop-blur print:hidden",
        className,
      )}
    >
      <span className="px-2 font-medium text-muted-foreground">{t("label")}</span>
      {variants.map((v, i) => (
        <Link
          key={v.key}
          href={v.href}
          title={t(v.key)}
          aria-current={v.key === current ? "page" : undefined}
          className={cn(
            "grid size-7 place-items-center rounded-full font-semibold transition",
            v.key === current ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {i + 1}
        </Link>
      ))}
    </nav>
  );
}
