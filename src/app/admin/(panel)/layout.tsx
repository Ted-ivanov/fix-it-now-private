import { requireAdmin } from "@/server/auth";
import { AdminNav } from "./admin-nav";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav userName={session.user.name} userEmail={session.user.email} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
