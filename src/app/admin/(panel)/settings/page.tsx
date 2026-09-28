import { db } from "@/server/db";
import { getCompanyHours, listCategoriesWithDurations, listClosedDays } from "@/server/services/admin";
import { getSettings } from "@/server/services/settings";
import { PageHeader } from "../../_components/page-header";
import { CategoryEditor, ClosedDaysEditor, CompanyHoursForm, RulesForm } from "./settings-forms";

export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const [settings, hours, closedDays, categories] = await Promise.all([
    getSettings(db),
    getCompanyHours(db),
    listClosedDays(db),
    listCategoriesWithDurations(db),
  ]);
  return (
    <>
      <PageHeader title="Настройки" description="Правила за записване на часове, работно време и услуги." />
      <div className="grid gap-6">
        <RulesForm
          initial={{
            travelBufferMinutes: settings.travelBufferMinutes,
            slotStepMinutes: settings.slotStepMinutes,
            bookingHorizonDays: settings.bookingHorizonDays,
            minNoticeHours: settings.minNoticeHours,
            notificationEmail: settings.notificationEmail ?? "",
          }}
        />
        <CompanyHoursForm initial={hours.map(({ weekday, openMinute, closeMinute }) => ({ weekday, openMinute, closeMinute }))} />
        <ClosedDaysEditor days={closedDays.map((d) => ({ day: d.day, note: d.note }))} />
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Услуги</h2>
          {categories.map((c) => (
            <CategoryEditor
              key={c.id}
              category={{
                id: c.id,
                nameBg: c.nameBg,
                nameEn: c.nameEn ?? "",
                descriptionBg: c.descriptionBg ?? "",
                descriptionEn: c.descriptionEn ?? "",
                icon: c.icon,
                active: c.active,
                bufferMinutes: c.bufferMinutes,
                inspectionMinutes: c.inspectionMinutes,
                repairMinutes: c.repairMinutes,
              }}
            />
          ))}
        </section>
      </div>
    </>
  );
}
