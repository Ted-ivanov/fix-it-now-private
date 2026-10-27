"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CategoryIcon, categoryIconNames } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  addClosedDayAction,
  deleteClosedDayAction,
  setWorkingHoursAction,
  updateCategoryAction,
  updateContactEmailsAction,
  updateSettingsAction,
} from "@/server/actions/admin";
import { HoursEditor, type HoursRow } from "../../_components/hours-editor";

function useSave() {
  const [pending, startTransition] = useTransition();
  const save = (fn: () => Promise<{ ok: boolean; error?: string }>, success = "Запазено.") =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) toast.success(success);
      else toast.error(r.error ?? "Грешка");
    });
  return { pending, save };
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border bg-background p-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  suffix,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-28" />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function RulesForm({
  initial,
}: {
  initial: {
    travelBufferMinutes: number;
    slotStepMinutes: number;
    bookingHorizonDays: number;
    minNoticeHours: number;
    notificationEmail: string;
  };
}) {
  const { pending, save } = useSave();
  const [v, setV] = useState(initial);
  const set = (key: keyof typeof v) => (value: number | string) => setV((s) => ({ ...s, [key]: value }));

  return (
    <Card title="Правила за записване">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          id="buffer"
          label="Време за път между адреси"
          hint="Добавя се след всяко посещение. Може да се промени за отделна услуга."
          value={v.travelBufferMinutes}
          onChange={set("travelBufferMinutes")}
          suffix="мин."
        />
        <NumberField
          id="step"
          label="Интервал между часовете"
          hint="Напр. 30 → 8:00, 8:30, 9:00…"
          value={v.slotStepMinutes}
          onChange={set("slotStepMinutes")}
          suffix="мин."
        />
        <NumberField
          id="notice"
          label="Минимално предизвестие"
          hint="Колко часа напред най-рано може да се запише."
          value={v.minNoticeHours}
          onChange={set("minNoticeHours")}
          suffix="часа"
        />
        <NumberField
          id="horizon"
          label="Записване до"
          hint="Колко дни напред е отворен календарът."
          value={v.bookingHorizonDays}
          onChange={set("bookingHorizonDays")}
          suffix="дни"
        />
      </div>
      <div className="grid max-w-md gap-1.5">
        <Label htmlFor="notify">Имейл за известия при нова заявка</Label>
        <Input
          id="notify"
          type="email"
          value={v.notificationEmail}
          onChange={(e) => set("notificationEmail")(e.target.value)}
          placeholder="office@…"
        />
      </div>
      <Button className="justify-self-start" disabled={pending} onClick={() => save(() => updateSettingsAction(v))}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Запази правилата
      </Button>
    </Card>
  );
}

export function CompanyHoursForm({ initial }: { initial: HoursRow[] }) {
  const { pending, save } = useSave();
  const [hours, setHours] = useState(initial);
  return (
    <Card title="Работно време на фирмата" description="Важи за всички екипи без собствено работно време.">
      <HoursEditor value={hours} onChange={setHours} />
      <Button className="justify-self-start" disabled={pending} onClick={() => save(() => setWorkingHoursAction(null, hours))}>
        Запази работното време
      </Button>
    </Card>
  );
}

export function ClosedDaysEditor({ days }: { days: { day: string; note: string | null }[] }) {
  const { pending, save } = useSave();
  const [day, setDay] = useState("");
  const [note, setNote] = useState("");
  return (
    <Card title="Почивни дни" description="Официални празници и дни, в които фирмата не работи.">
      {days.length > 0 && (
        <ul className="grid gap-2 text-sm">
          {days.map((d) => (
            <li key={d.day} className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
              <span className="font-medium tabular-nums">{new Date(`${d.day}T12:00:00Z`).toLocaleDateString("bg-BG")}</span>
              <span className="flex-1 text-muted-foreground">{d.note}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Премахни"
                disabled={pending}
                onClick={() => save(() => deleteClosedDayAction(d.day), "Премахнато.")}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="closed-day">Дата</Label>
          <Input id="closed-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="closed-note">Бележка</Label>
          <Input id="closed-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="напр. Коледа" />
        </div>
        <Button
          variant="secondary"
          disabled={pending || !day}
          onClick={() => {
            save(() => addClosedDayAction(day, note), "Добавено.");
            setDay("");
            setNote("");
          }}
        >
          <Plus className="size-4" aria-hidden />
          Добави
        </Button>
      </div>
    </Card>
  );
}

type CategoryState = {
  id: string;
  nameBg: string;
  nameEn: string;
  descriptionBg: string;
  descriptionEn: string;
  icon: string;
  active: boolean;
  bufferMinutes: number | null;
  inspectionMinutes: number;
  repairMinutes: number;
};

export function CategoryEditor({ category }: { category: CategoryState }) {
  const { pending, save } = useSave();
  const [c, setC] = useState(category);
  const set = <K extends keyof CategoryState>(key: K, value: CategoryState[K]) => setC((s) => ({ ...s, [key]: value }));
  const id = (name: string) => `${category.id}-${name}`;

  return (
    <section className="grid gap-4 rounded-xl border bg-background p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary">
          <CategoryIcon name={c.icon} className="size-5" />
        </span>
        <h3 className="flex-1 font-semibold">{c.nameBg}</h3>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={c.active} onCheckedChange={(v) => set("active", v)} />
          {c.active ? "Показва се на сайта" : "Скрита"}
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={id("nameBg")}>Име (български)</Label>
          <Input id={id("nameBg")} value={c.nameBg} onChange={(e) => set("nameBg", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={id("nameEn")}>Име (английски)</Label>
          <Input id={id("nameEn")} value={c.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={id("descBg")}>Описание (български)</Label>
          <Textarea id={id("descBg")} rows={2} value={c.descriptionBg} onChange={(e) => set("descriptionBg", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={id("descEn")}>Описание (английски)</Label>
          <Textarea id={id("descEn")} rows={2} value={c.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-5">
        <NumberField
          id={id("inspection")}
          label="Продължителност на оглед"
          value={c.inspectionMinutes}
          onChange={(v) => set("inspectionMinutes", v)}
          suffix="мин."
        />
        <NumberField
          id={id("repair")}
          label="Продължителност на ремонт"
          value={c.repairMinutes}
          onChange={(v) => set("repairMinutes", v)}
          suffix="мин."
        />
        <div className="grid gap-1.5">
          <Label htmlFor={id("buffer")}>Време за път</Label>
          <div className="flex items-center gap-2">
            <Input
              id={id("buffer")}
              type="number"
              min={0}
              placeholder="общо"
              value={c.bufferMinutes ?? ""}
              onChange={(e) => set("bufferMinutes", e.target.value === "" ? null : Number(e.target.value))}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">мин. (празно = общата настройка)</span>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={id("icon")}>Икона</Label>
          <select
            id={id("icon")}
            value={c.icon}
            onChange={(e) => set("icon", e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {categoryIconNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button
        className="justify-self-start"
        disabled={pending}
        onClick={() => {
          const { id: categoryId, ...input } = c;
          save(() => updateCategoryAction(categoryId, { ...input, nameEn: input.nameEn || null, descriptionBg: input.descriptionBg || null, descriptionEn: input.descriptionEn || null }));
        }}
      >
        Запази услугата
      </Button>
    </section>
  );
}

export function ContactEmailsForm({ initial, fallback }: { initial: string[]; fallback: string | null }) {
  const { pending, save } = useSave();
  const [emails, setEmails] = useState(initial.length > 0 ? initial : [""]);
  const update = (i: number, value: string) => setEmails((list) => list.map((e, j) => (j === i ? value : e)));

  return (
    <Card
      title="Имейли за запитвания от чата"
      description={
        fallback
          ? `Всяко запитване от чат асистента се изпраща до тези адреси. Ако списъкът е празен, се използва ${fallback}.`
          : "Всяко запитване от чат асистента се изпраща до тези адреси."
      }
    >
      <ul className="grid max-w-md gap-2">
        {emails.map((email, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => update(i, e.target.value)}
              placeholder="ime@firma.bg"
              aria-label={`Имейл ${i + 1}`}
            />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Премахни"
              onClick={() => setEmails((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : [""]))}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setEmails((list) => [...list, ""])} disabled={emails.length >= 20}>
          <Plus className="size-4" aria-hidden />
          Добави имейл
        </Button>
        <Button disabled={pending} onClick={() => save(() => updateContactEmailsAction(emails))}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Запази имейлите
        </Button>
      </div>
    </Card>
  );
}
