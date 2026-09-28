import { db } from "@/server/db";
import { listCategoriesWithDurations, listTeams } from "@/server/services/admin";
import { PageHeader } from "../../_components/page-header";
import { fmtDateTime } from "../../_lib/format";
import { NewTeamForm, TeamCard } from "./team-forms";

export const metadata = { title: "Екипи" };

export default async function TeamsPage() {
  const [teams, categories] = await Promise.all([listTeams(db), listCategoriesWithDurations(db)]);
  const options = categories.map((c) => ({ id: c.id, name: c.nameBg }));
  return (
    <>
      <PageHeader
        title="Екипи"
        description="Колко екипа има за всяка услуга и кога работят. Свободните часове на сайта се смятат от тук."
      />
      <div className="grid gap-6">
        {teams.map((t) => (
          <TeamCard
            key={t.id}
            team={{
              id: t.id,
              name: t.name,
              active: t.active,
              categoryIds: t.categoryIds,
              hours: t.hours.map(({ weekday, openMinute, closeMinute }) => ({ weekday, openMinute, closeMinute })),
              timeOff: t.timeOff.map((o) => ({
                id: o.id,
                label: `${fmtDateTime(o.startAt)} – ${fmtDateTime(o.endAt)}`,
                reason: o.reason,
              })),
            }}
            categories={options}
          />
        ))}
        <NewTeamForm categories={options} />
      </div>
    </>
  );
}
