"use client";

import { CalendarDays, ExternalLink, Images, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Табло", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Резервации", icon: CalendarDays },
  { href: "/admin/galleries", label: "Галерии", icon: Images },
  { href: "/admin/teams", label: "Екипи", icon: Users },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

export function AdminNav({ userName, userEmail }: { userName: string; userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="border-b bg-background lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-2 p-4">
        <Link href="/admin">
          <Logo />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Изход"
          onClick={async () => {
            await authClient.signOut();
            router.replace("/admin/login");
          }}
        >
          <LogOut className="size-4" aria-hidden />
        </Button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
        <a
          href="/"
          target="_blank"
          className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-4" aria-hidden />
          Към сайта
        </a>
      </nav>
      <div className="mt-auto hidden border-t p-4 lg:block">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={async () => {
            await authClient.signOut();
            router.replace("/admin/login");
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Изход
        </Button>
      </div>
    </aside>
  );
}
