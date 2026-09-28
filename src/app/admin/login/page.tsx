import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/logo";
import { auth } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход" };

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/admin");
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-background p-8 shadow-sm">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold">Вход в администрацията</h1>
        <LoginForm />
      </div>
    </main>
  );
}
