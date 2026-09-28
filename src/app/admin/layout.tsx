import type { Metadata } from "next";
import { Onest } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../globals.css";

const onest = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-onest", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Администрация", template: "%s | Fix It Now – администрация" },
  robots: { index: false, follow: false },
};

// Separate root layout: the admin is Bulgarian-only and has no public header/footer.
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="bg" className={`${onest.variable} h-full antialiased`}>
      <body className="min-h-full bg-muted/40">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
