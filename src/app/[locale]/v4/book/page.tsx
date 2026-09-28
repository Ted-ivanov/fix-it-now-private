import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { toClientCategories } from "@/components/booking/client-category";
import { ChatBooking } from "@/components/variants/v4/chat-booking";
import { db } from "@/server/db";
import { getCatalog } from "@/server/services/catalog";

export default async function V4Book({ params, searchParams }: PageProps<"/[locale]/v4/book">) {
  const { locale } = await params;
  const q = await searchParams;
  setRequestLocale(locale);
  await connection();
  const categories = toClientCategories(await getCatalog(db), locale);
  return (
    <ChatBooking categories={categories} initialCategory={typeof q.category === "string" ? q.category : undefined} />
  );
}
