"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  addTimeOffAction,
  createTeamAction,
  deleteTeamAction,
  deleteTimeOffAction,
  setWorkingHoursAction,
  updateTeamAction,
} from "@/server/actions/admin";
import { HoursEditor, type HoursRow } from "../../_components/hours-editor";

type Option = { id: string; name: string };

function CategoryChecks({ options, value, onChange }: { options: Option[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.includes(c.id)}
            onCheckedChange={(on) => onChange(on ? [...value, c.id] : value.filter((id) => id !== c.id))}
          />
          {c.name}
        </label>
      ))}
    </div>
  );
}

function useAction() {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success = "Запазено.") =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) toast.success(success);
      else toast.error(r.error ?? "Грешка");
    });
  return { pending, run, startTransition };
}

export function TeamCard({
  team,
  categories,
}: {
  team: {
    id: string;
    name: string;
    active: boolean;
    categoryIds: string[];
    hours: HoursRow[];
    timeOff: { id: string; label: string; reason: string | null }[];
  };
  categories: Option[];
}) {
  const { pending, run, startTransition } = useAction();
  const [name, setName] = useState(team.name);
  const [active, setActive] = useState(team.active);
  const [categoryIds, setCategoryIds] = useState(team.categoryIds);
  const [ownHours, setOwnHours] = useState(team.hours.length > 0);
  const [hours, setHours] = useState<HoursRow[]>(
    team.hours.length > 0 ? team.hours : [1, 2, 3, 4, 5].map((weekday) => ({ weekday, openMinute: 480, closeMinute: 1080 })),
  );
  const [off, setOff] = useState({ start: "", end: "", reason: "" });

  return (
    <section className="grid gap-5 rounded-xl border bg-background p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor={`name-${team.id}`}>Име на екипа</Label>
          <Input id={`name-${team.id}`} value={name} onChange={(e) => setName(e.target.value)} className="w-64" />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium">
          <Switch checked={active} onCheckedChange={setActive} />
          {active ? "Активен" : "Неактивен (не приема нови резервации)"}
        </label>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Услуги, които екипът изпълнява</p>
        <CategoryChecks options={categories} value={categoryIds} onChange={setCategoryIds} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => run(() => updateTeamAction(team.id, { name, active, categoryIds }))}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Запази екипа
        </Button>
        <Button
          variant="ghost"
          className="text-destructive"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Да изтрием ли „${team.name}“?`)) return;
            startTransition(async () => {
              const r = await deleteTeamAction(team.id);
              toast.success(r.deleted ? "Екипът е изтрит." : "Екипът има резервации, затова е деактивиран.");
            });
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          Изтрий
        </Button>
      </div>

      <details className="rounded-lg border p-4" open={ownHours}>
        <summary className="cursor-pointer text-sm font-medium">Работно време на екипа</summary>
        <div className="mt-4 grid gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={ownHours} onCheckedChange={setOwnHours} />
            {ownHours ? "Собствено работно време" : "Използва работното време на фирмата (Настройки)"}
          </label>
          {ownHours && <HoursEditor value={hours} onChange={setHours} />}
          <Button
            variant="secondary"
            className="justify-self-start"
            disabled={pending}
            onClick={() => run(() => setWorkingHoursAction(team.id, ownHours ? hours : []))}
          >
            Запази работното време
          </Button>
        </div>
      </details>

      <details className="rounded-lg border p-4" open={team.timeOff.length > 0}>
        <summary className="cursor-pointer text-sm font-medium">Почивки и отсъствия ({team.timeOff.length})</summary>
        <div className="mt-4 grid gap-4">
          {team.timeOff.length > 0 && (
            <ul className="grid gap-2 text-sm">
              {team.timeOff.map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
                  <span className="flex-1">
                    {o.label}
                    {o.reason && <span className="text-muted-foreground"> · {o.reason}</span>}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Премахни"
                    disabled={pending}
                    onClick={() => run(() => deleteTimeOffAction(o.id), "Премахнато.")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`off-start-${team.id}`}>От</Label>
              <Input
                id={`off-start-${team.id}`}
                type="datetime-local"
                value={off.start}
                onChange={(e) => setOff((o) => ({ ...o, start: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`off-end-${team.id}`}>До</Label>
              <Input
                id={`off-end-${team.id}`}
                type="datetime-local"
                value={off.end}
                onChange={(e) => setOff((o) => ({ ...o, end: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`off-reason-${team.id}`}>Причина</Label>
              <Input
                id={`off-reason-${team.id}`}
                value={off.reason}
                placeholder="напр. отпуск"
                onChange={(e) => setOff((o) => ({ ...o, reason: e.target.value }))}
              />
            </div>
            <Button
              variant="secondary"
              disabled={pending || !off.start || !off.end}
              onClick={() => {
                run(() => addTimeOffAction({ teamId: team.id, ...off }), "Добавено.");
                setOff({ start: "", end: "", reason: "" });
              }}
            >
              <Plus className="size-4" aria-hidden />
              Добави
            </Button>
          </div>
        </div>
      </details>
    </section>
  );
}

export function NewTeamForm({ categories }: { categories: Option[] }) {
  const { pending, run } = useAction();
  const [name, setName] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  return (
    <section className="grid gap-4 rounded-xl border border-dashed bg-background p-5">
      <h2 className="font-semibold">Нов екип</h2>
      <div className="grid gap-1.5">
        <Label htmlFor="new-team">Име</Label>
        <Input id="new-team" value={name} onChange={(e) => setName(e.target.value)} className="w-64" placeholder="напр. Екип 3" />
      </div>
      <CategoryChecks options={categories} value={categoryIds} onChange={setCategoryIds} />
      <Button
        className="justify-self-start"
        disabled={pending || !name.trim()}
        onClick={() => {
          run(() => createTeamAction({ name, categoryIds }), "Екипът е добавен.");
          setName("");
          setCategoryIds([]);
        }}
      >
        <Plus className="size-4" aria-hidden />
        Добави екип
      </Button>
    </section>
  );
}
