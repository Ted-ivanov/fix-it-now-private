// Google sends the team member back here after they allow (or deny) calendar access.
import { after, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { googleConfigured } from "@/server/google/client";
import { completeConnect } from "@/server/google/connect";
import { messagePage } from "@/server/google/page";
import { syncMemberUpcoming } from "@/server/google/sync";

export async function GET(request: NextRequest) {
  if (!googleConfigured()) return messagePage("Google Calendar не е настроен", "Свържете се с офиса.", 503);

  const params = request.nextUrl.searchParams;
  const state = params.get("state") ?? "";
  const code = params.get("code");
  if (!code) {
    return messagePage(
      "Календарът не е свързан",
      "Достъпът беше отказан. Ако е станало по погрешка, отворете линка отново и натиснете „Разрешаване“.",
      400,
    );
  }

  try {
    const result = await completeConnect(db, state, code);
    if (result.ok) {
      // Put the team's already booked jobs into the calendar too.
      after(() => syncMemberUpcoming(db, result.memberId));
      return messagePage(
        "Готово! Календарът е свързан.",
        `${result.name}, новите посещения на екипа ви ще се появяват в Google Calendar на ${result.googleEmail}, с напомнянията, зададени в офиса.`,
      );
    }
    const messages: Record<typeof result.reason, string> = {
      link: "Линкът е изтекъл или вече е използван. Помолете офиса за нов линк.",
      scope:
        "Не беше разрешен достъп до календара. Отворете линка отново и отметнете „Преглед и редактиране на събития“.",
      "email-mismatch": `Влязохте с друг Google акаунт. Използвайте ${result.expectedEmail ?? "акаунта, записан в офиса"}.`,
      "no-refresh-token": "Google не върна нужните данни. Отворете линка отново.",
    };
    return messagePage("Календарът не е свързан", messages[result.reason], 400);
  } catch (error) {
    console.error("[google] callback", error);
    return messagePage("Календарът не е свързан", "Възникна грешка. Опитайте отново по-късно.", 500);
  }
}
